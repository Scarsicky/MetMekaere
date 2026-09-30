import { NextResponse } from 'next/server';

import { fetchPayment } from '@/lib/shop/mollie';
import { getOrderByPaymentId } from '@/lib/shop/orders';
import { syncOrderWithPayment } from '@/lib/shop/payment-flow';

/**
 * De webhook van Mollie.
 *
 * Mollie stuurt hier alleen een betaal-id naartoe, verder niets. Wij halen met
 * dat id zélf de status op bij Mollie. Iemand die dit adres nabootst en een
 * willekeurig id meestuurt, krijgt daarom niets voor elkaar: de status komt
 * altijd van Mollie, nooit uit het verzoek.
 *
 * We antwoorden altijd met 200 zodra we het bericht hebben verwerkt of
 * afgewezen. Een foutcode zou Mollie laten blijven herhalen, en dat helpt niet
 * als het probleem aan onze kant zit. Een echt onverwachte fout geeft wel 500,
 * zodat Mollie het later nog eens probeert.
 */
export async function POST(request: Request) {
  let paymentId: string | null = null;

  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { id?: string };
      paymentId = body.id ?? null;
    } else {
      const form = await request.formData();
      const value = form.get('id');
      paymentId = typeof value === 'string' ? value : null;
    }
  } catch (error) {
    console.error('[mollie] webhook zonder leesbare inhoud:', error);
    return NextResponse.json({ ok: false, reason: 'onleesbaar' }, { status: 200 });
  }

  if (!paymentId || !/^tr_[A-Za-z0-9]+$/.test(paymentId)) {
    console.warn(`[mollie] webhook met een onbruikbaar betaal-id: ${String(paymentId).slice(0, 40)}`);
    return NextResponse.json({ ok: false, reason: 'ongeldig id' }, { status: 200 });
  }

  try {
    // Eerst kijken of wij deze betaling kennen.
    let order = await getOrderByPaymentId(paymentId);

    // Zo niet, dan kan het ordernummer nog in de metadata van Mollie staan.
    if (!order) {
      const payment = await fetchPayment(paymentId);
      if (payment?.orderId) {
        const result = await syncOrderWithPayment(payment.orderId);
        return NextResponse.json({ ok: result.outcome !== 'unknown' }, { status: 200 });
      }
      console.warn(`[mollie] webhook voor onbekende betaling ${paymentId}`);
      return NextResponse.json({ ok: false, reason: 'onbekende betaling' }, { status: 200 });
    }

    const result = await syncOrderWithPayment(order.id);
    console.info(`[mollie] webhook ${paymentId} → ${order.orderNumber}: ${result.outcome}`);
    return NextResponse.json({ ok: true, outcome: result.outcome }, { status: 200 });
  } catch (error) {
    // Onverwacht: laat Mollie het straks opnieuw proberen.
    console.error(`[mollie] webhook ${paymentId} mislukte:`, error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** Mollie controleert soms of het adres bestaat. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
