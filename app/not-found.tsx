import Image from 'next/image';
import Link from 'next/link';

import { ButtonLink } from '@/components/ui/button';

export const metadata = {
  title: 'Deze pagina bestaat niet',
  robots: { index: false, follow: true },
};

/**
 * Een pagina die niet bestaat. Geen foutcode maar een zetje in de goede
 * richting — meestal is iemand op zoek naar de webshop.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-sand-100 px-5 py-20 text-center">
      <Image src="/logo.png" alt="" width={512} height={512} className="size-20" />

      <h1 className="mt-6 text-3xl md:text-4xl">Deze pagina konden we niet vinden</h1>
      <p className="mt-4 max-w-md text-lg text-sand-700">
        Misschien is hij verhuisd, of klopt er iets niet aan de link. Hieronder kom je vast alsnog
        waar je wilde zijn.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Naar de homepagina</ButtonLink>
        <ButtonLink href="/webshop" variant="secondary">
          Naar de webshop
        </ButtonLink>
      </div>

      <p className="mt-10 text-sm text-sand-600">
        Klopt er iets niet?{' '}
        <Link href="/contact" className="text-brand-700 underline underline-offset-2">
          Laat het weten
        </Link>
        .
      </p>
    </div>
  );
}
