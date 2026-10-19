/**
 * Een foto verkleinen vóórdat hij wordt geüpload.
 *
 * Waarom in de browser en niet op de server: het werk gebeurt op de machine van
 * degene die de foto uitkiest, de upload zelf wordt twintig keer korter, en de
 * server heeft er geen beeldbibliotheek voor nodig — die draait op één
 * processor met 512 MB en moet ondertussen gewoon de winkel bedienen.
 *
 * Dit is geen overbodige luxe. App Hosting zet de beeldoptimalisatie van
 * Next.js standaard uit, dus wat hier wordt opgeslagen is letterlijk wat een
 * bezoeker binnenhaalt. Een foto van 5 MB is dan 5 MB over de lijn van iemand
 * die op zijn telefoon in de bus zit.
 */

/**
 * De langste zijde. De productpagina toont een foto op zijn breedst zo'n 544
 * punten; op een scherm met drie beeldpunten per punt is dat ruim 1600.
 * Groter aanleveren levert niets zichtbaars meer op.
 */
const MAX_DIMENSION = 1600;

/** WebP op deze kwaliteit is met het oog niet van het origineel te houden. */
const QUALITY = 0.82;

/**
 * Onder deze grens laten we het bestand met rust, mits het ook niet te groot
 * is in afmetingen. Opnieuw coderen kost altijd een beetje kwaliteit, en bij
 * een bestand dat al klein is valt er niets te winnen.
 */
const LEAVE_ALONE_UNDER_BYTES = 300 * 1024;

export interface ShrinkResult {
  file: File;
  /** Hoeveel er is afgegaan; 0 als het bestand ongemoeid is gelaten. */
  savedBytes: number;
}

/**
 * De nieuwe afmetingen, of `null` als de foto al klein genoeg is.
 * Geëxporteerd om te kunnen testen; de regel 'nooit vergroten' is er een die
 * stilletjes kan breken en dan onscherpe, grotere bestanden oplevert.
 */
export function targetSize(width: number, height: number): { width: number; height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION) return null; // niet vergroten
  const factor = MAX_DIMENSION / longest;
  return { width: Math.round(width * factor), height: Math.round(height * factor) };
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Geeft een kleinere versie terug, of het oorspronkelijke bestand wanneer
 * verkleinen niet kan of niets oplevert.
 *
 * Mislukken mag nooit betekenen dat iemand zijn foto niet kwijt kan: bij elke
 * twijfel gaat het origineel de deur uit.
 */
export async function shrinkForUpload(file: File): Promise<ShrinkResult> {
  const unchanged: ShrinkResult = { file, savedBytes: 0 };

  /*
   * Een bewegende GIF overleeft dit niet: tekenen op een canvas levert één
   * beeldje op en de animatie is weg. Die laten we dus met rust.
   */
  if (file.type === 'image/gif') return unchanged;
  if (!file.type.startsWith('image/')) return unchanged;

  try {
    // `from-image` zorgt dat een foto die rechtop hoort te staan dat ook doet;
    // telefoons leggen die draaiing in de bestandsgegevens vast.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const size = targetSize(bitmap.width, bitmap.height);

    if (!size && file.size <= LEAVE_ALONE_UNDER_BYTES) {
      bitmap.close();
      return unchanged;
    }

    const width = size?.width ?? bitmap.width;
    const height = size?.height ?? bitmap.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return unchanged;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // WebP is kleiner en kan doorzichtigheid aan, wat PNG-ontwerpen nodig
    // hebben. Kan de browser het niet, dan is JPEG de terugval.
    let blob = await encode(canvas, 'image/webp');
    let extension = 'webp';
    if (!blob) {
      blob = await encode(canvas, 'image/jpeg');
      extension = 'jpg';
    }
    if (!blob || blob.size >= file.size) return unchanged;

    const base = file.name.replace(/\.[^.]+$/, '') || 'foto';
    const shrunk = new File([blob], `${base}.${extension}`, { type: blob.type });
    return { file: shrunk, savedBytes: file.size - shrunk.size };
  } catch {
    // Geen canvas, geen geheugen, een bestand dat niet te lezen is — wat het
    // ook is, het origineel gaat gewoon de deur uit.
    return unchanged;
  }
}
