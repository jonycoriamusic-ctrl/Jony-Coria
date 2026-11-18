"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Heart, ListMusic, Music2, QrCode, Radio, Smartphone } from "lucide-react";
import type { Locale } from "@musica/contracts";
import { BrandMark } from "@/components/brand-mark";
import { isDemo } from "@/lib/auth";
import { useLocale } from "@/lib/i18n";
import { menuHref } from "@/lib/navigation";
import { useLastMenu } from "@/lib/use-last-menu";

type LandingCopy = {
  eyebrow: string;
  headline: [string, string];
  introduction: string;
  createAccount: string;
  demoCta: string;
  signIn: string;
  explore: string;
  freeNote: string;
  previewLabel: string;
  previewShow: string;
  previewQueue: string;
  previewRequest: string;
  previewDedication: string;
  previewQr: string;
  howEyebrow: string;
  howTitle: string;
  howIntroduction: string;
  steps: { title: string; description: string }[];
  benefitsEyebrow: string;
  benefitsTitle: string;
  benefits: { title: string; description: string }[];
  paymentNote: string;
  freeEyebrow: string;
  freeTitle: string;
  freeDescription: string;
  footerLine: string;
};

const copy: Record<Locale, LandingCopy> = {
  "es-AR": {
    eyebrow: "Para músicos en vivo",
    headline: ["Tus canciones.", "Su noche."],
    introduction: "Mostrá tu repertorio, recibí pedidos y manejá tu show desde el celu. Tu público escanea un QR, elige una canción y puede sumarle una dedicatoria.",
    createAccount: "Crear cuenta gratis",
    demoCta: "Entrar a la demo",
    signIn: "Ya tengo cuenta",
    explore: "Conocé cómo funciona",
    freeNote: "Gratis por ahora · Sin tarjeta de crédito",
    previewLabel: "TU SHOW, EN VIVO",
    previewShow: "La noche empieza acá",
    previewQueue: "Cola de pedidos",
    previewRequest: "Canción elegida",
    previewDedication: "+ dedicatoria",
    previewQr: "Un QR para todos tus shows",
    howEyebrow: "SIMPLE DE PRINCIPIO A FIN",
    howTitle: "Así funciona",
    howIntroduction: "Preparás el show una vez. Durante la noche, los pedidos llegan directo a tu cola.",
    steps: [
      { title: "Armá tu perfil y tu carta", description: "Agregá tus canciones, organizalas en carpetas y elegí el precio por canción y el adicional por dedicatoria." },
      { title: "Programá tu show", description: "Elegí fecha, hora, repertorio y cupo. Tu QR permanente muestra automáticamente el show que corresponde." },
      { title: "Dejá que el público elija", description: "Escanean el QR, piden una canción, pueden escribir una dedicatoria y transfieren a tus datos de pago." },
      { title: "Tocá a tu ritmo", description: "Los pedidos entran a tu cola. Desde el celular ves qué sigue y podés ajustar el cupo en vivo." },
    ],
    benefitsEyebrow: "HECHO PARA TU ESCENARIO",
    benefitsTitle: "Vos ponés las reglas. La música hace el resto.",
    benefits: [
      { title: "Tu repertorio, tus precios", description: "Ofrecé solo las canciones que tocás y decidí cuánto cuesta pedirlas o dedicar una." },
      { title: "Un QR que se queda", description: "Imprimilo una vez. Cada show nuevo aparece en el mismo enlace cuando llega su fecha y hora." },
      { title: "Todo a mano", description: "Perfil, carta, shows y cola de pedidos en una experiencia pensada para usar desde el celular." },
    ],
    paymentNote: "Los invitados declaran la transferencia de buena fe. La app no verifica el pago bancario: revisá tu cuenta para confirmarlo.",
    freeEyebrow: "EMPEZÁ HOY",
    freeTitle: "Tu próximo show ya puede tener su propia carta.",
    freeDescription: "Creá tu cuenta y prepará tu perfil sin pagar. Musica a la carta es gratis para usar por ahora.",
    footerLine: "La música en vivo, más cerca de tu público.",
  },
  en: {
    eyebrow: "For live musicians",
    headline: ["Your songs.", "Their night."],
    introduction: "Show your repertoire, take requests, and run your show from your phone. Your audience scans one QR, picks a song, and can add a dedication.",
    createAccount: "Create a free account",
    demoCta: "Open the demo",
    signIn: "I have an account",
    explore: "See how it works",
    freeNote: "Free for now · No credit card required",
    previewLabel: "YOUR SHOW, LIVE",
    previewShow: "The night starts here",
    previewQueue: "Request queue",
    previewRequest: "Song requested",
    previewDedication: "+ dedication",
    previewQr: "One QR for every show",
    howEyebrow: "SIMPLE FROM START TO FINISH",
    howTitle: "How it works",
    howIntroduction: "Set up your show once. During the night, requests arrive in your queue.",
    steps: [
      { title: "Build your profile and menu", description: "Add songs, arrange them in folders, and set your song price and dedication add-on." },
      { title: "Schedule your show", description: "Choose the date, time, repertoire, and capacity. Your permanent QR automatically shows the right show." },
      { title: "Let the audience choose", description: "They scan the QR, request a song, can write a dedication, and transfer to your payment details." },
      { title: "Play at your pace", description: "Requests join your queue. See what is next and adjust capacity live from your phone." },
    ],
    benefitsEyebrow: "BUILT FOR YOUR STAGE",
    benefitsTitle: "You set the terms. The music does the rest.",
    benefits: [
      { title: "Your songs, your prices", description: "Offer only the songs you play and decide what a request or dedication costs." },
      { title: "A QR that stays", description: "Print it once. Each new show appears at the same link when its date and time arrive." },
      { title: "Everything in hand", description: "Profile, song menu, shows, and request queue in an experience designed for your phone." },
    ],
    paymentNote: "Guests declare transfers in good faith. The app does not verify bank settlement; check your bank account to confirm payment.",
    freeEyebrow: "START TODAY",
    freeTitle: "Give your next show its own music menu.",
    freeDescription: "Create an account and set up your profile at no cost. Music Menu is free to use for now.",
    footerLine: "Bringing live music closer to your audience.",
  },
  "pt-BR": {
    eyebrow: "Para músicos ao vivo",
    headline: ["Suas músicas.", "A noite deles."],
    introduction: "Mostre seu repertório, receba pedidos e organize o show pelo celular. O público escaneia um QR, escolhe uma música e pode adicionar uma dedicatória.",
    createAccount: "Criar conta grátis",
    demoCta: "Abrir demonstração",
    signIn: "Já tenho uma conta",
    explore: "Veja como funciona",
    freeNote: "Grátis por enquanto · Sem cartão de crédito",
    previewLabel: "SEU SHOW, AO VIVO",
    previewShow: "A noite começa aqui",
    previewQueue: "Fila de pedidos",
    previewRequest: "Música pedida",
    previewDedication: "+ dedicatória",
    previewQr: "Um QR para todos os seus shows",
    howEyebrow: "SIMPLES DO INÍCIO AO FIM",
    howTitle: "Como funciona",
    howIntroduction: "Prepare o show uma vez. Durante a noite, os pedidos chegam direto à sua fila.",
    steps: [
      { title: "Crie seu perfil e cardápio", description: "Adicione músicas, organize-as em pastas e defina o preço por música e o adicional por dedicatória." },
      { title: "Programe seu show", description: "Escolha data, hora, repertório e limite de pedidos. Seu QR permanente mostra automaticamente o show certo." },
      { title: "Deixe o público escolher", description: "O público escaneia o QR, pede uma música, pode escrever uma dedicatória e faz a transferência." },
      { title: "Toque no seu ritmo", description: "Os pedidos entram na fila. Veja o que vem a seguir e ajuste o limite ao vivo pelo celular." },
    ],
    benefitsEyebrow: "FEITO PARA O SEU PALCO",
    benefitsTitle: "Você define as regras. A música faz o resto.",
    benefits: [
      { title: "Seu repertório, seus preços", description: "Ofereça só as músicas que você toca e decida o valor dos pedidos e dedicatórias." },
      { title: "Um QR que permanece", description: "Imprima uma vez. Cada novo show aparece no mesmo link quando chega sua data e hora." },
      { title: "Tudo na palma da mão", description: "Perfil, cardápio, shows e fila de pedidos em uma experiência feita para o celular." },
    ],
    paymentNote: "Os convidados declaram a transferência de boa-fé. O app não verifica o pagamento bancário; confira sua conta para confirmar.",
    freeEyebrow: "COMECE HOJE",
    freeTitle: "Seu próximo show já pode ter um cardápio musical.",
    freeDescription: "Crie sua conta e prepare seu perfil sem pagar. O Music Menu é grátis por enquanto.",
    footerLine: "A música ao vivo mais perto do seu público.",
  },
  it: {
    eyebrow: "Per musicisti dal vivo",
    headline: ["Le tue canzoni.", "La loro serata."],
    introduction: "Mostra il tuo repertorio, ricevi richieste e gestisci lo spettacolo dal telefono. Il pubblico scansiona un QR, sceglie una canzone e può aggiungere una dedica.",
    createAccount: "Crea un account gratuito",
    demoCta: "Apri la demo",
    signIn: "Ho già un account",
    explore: "Scopri come funziona",
    freeNote: "Gratis per ora · Nessuna carta di credito",
    previewLabel: "IL TUO SHOW, DAL VIVO",
    previewShow: "La serata inizia qui",
    previewQueue: "Coda delle richieste",
    previewRequest: "Canzone richiesta",
    previewDedication: "+ dedica",
    previewQr: "Un QR per tutti i tuoi show",
    howEyebrow: "SEMPLICE DALL'INIZIO ALLA FINE",
    howTitle: "Come funziona",
    howIntroduction: "Prepara lo show una volta. Durante la serata, le richieste arrivano direttamente nella tua coda.",
    steps: [
      { title: "Crea profilo e repertorio", description: "Aggiungi le canzoni, organizzale in cartelle e imposta il prezzo per brano e il supplemento per la dedica." },
      { title: "Programma lo show", description: "Scegli data, ora, repertorio e numero massimo di richieste. Il QR permanente mostra lo show giusto automaticamente." },
      { title: "Lascia scegliere il pubblico", description: "Scansionano il QR, richiedono un brano, possono scrivere una dedica e fanno un bonifico ai tuoi dati." },
      { title: "Suona al tuo ritmo", description: "Le richieste entrano in coda. Vedi cosa segue e modifica il limite in tempo reale dal telefono." },
    ],
    benefitsEyebrow: "PENSATO PER IL TUO PALCO",
    benefitsTitle: "Le regole le scegli tu. La musica fa il resto.",
    benefits: [
      { title: "I tuoi brani, i tuoi prezzi", description: "Proponi solo ciò che sai suonare e decidi il costo di una richiesta o di una dedica." },
      { title: "Un QR che rimane", description: "Stampalo una volta. Ogni nuovo show appare allo stesso link quando arriva il momento." },
      { title: "Tutto a portata di mano", description: "Profilo, repertorio, show e coda delle richieste in un'esperienza pensata per il telefono." },
    ],
    paymentNote: "Gli ospiti dichiarano il bonifico in buona fede. L'app non verifica l'accredito: controlla il conto per confermarlo.",
    freeEyebrow: "INIZIA OGGI",
    freeTitle: "Dai al tuo prossimo show un menu musicale.",
    freeDescription: "Crea un account e prepara il profilo senza pagare. Music Menu è gratuito per ora.",
    footerLine: "La musica dal vivo più vicina al tuo pubblico.",
  },
  fr: {
    eyebrow: "Pour les musiciens en live",
    headline: ["Vos chansons.", "Leur soirée."],
    introduction: "Présentez votre répertoire, recevez des demandes et gérez votre concert depuis votre téléphone. Le public scanne un QR, choisit un morceau et peut ajouter une dédicace.",
    createAccount: "Créer un compte gratuit",
    demoCta: "Ouvrir la démo",
    signIn: "J'ai déjà un compte",
    explore: "Découvrir le fonctionnement",
    freeNote: "Gratuit pour le moment · Sans carte bancaire",
    previewLabel: "VOTRE CONCERT, EN DIRECT",
    previewShow: "La soirée commence ici",
    previewQueue: "File des demandes",
    previewRequest: "Morceau demandé",
    previewDedication: "+ dédicace",
    previewQr: "Un QR pour tous vos concerts",
    howEyebrow: "SIMPLE DU DÉBUT À LA FIN",
    howTitle: "Comment ça marche",
    howIntroduction: "Préparez votre concert une fois. Pendant la soirée, les demandes arrivent directement dans votre file.",
    steps: [
      { title: "Créez votre profil et votre carte", description: "Ajoutez vos morceaux, classez-les dans des dossiers et fixez le prix par chanson et le supplément dédicace." },
      { title: "Programmez votre concert", description: "Choisissez la date, l'heure, le répertoire et la capacité. Votre QR permanent affiche automatiquement le bon concert." },
      { title: "Laissez le public choisir", description: "Il scanne le QR, demande un morceau, peut écrire une dédicace et effectue un virement vers vos coordonnées." },
      { title: "Jouez à votre rythme", description: "Les demandes arrivent dans votre file. Voyez la suite et ajustez la capacité en direct sur votre téléphone." },
    ],
    benefitsEyebrow: "PENSÉ POUR VOTRE SCÈNE",
    benefitsTitle: "Vous fixez les règles. La musique fait le reste.",
    benefits: [
      { title: "Vos morceaux, vos prix", description: "Proposez uniquement les morceaux que vous jouez et fixez le prix des demandes et des dédicaces." },
      { title: "Un QR durable", description: "Imprimez-le une seule fois. Chaque nouveau concert apparaît au même lien le moment venu." },
      { title: "Tout à portée de main", description: "Profil, répertoire, concerts et file des demandes dans une interface pensée pour le téléphone." },
    ],
    paymentNote: "Les invités déclarent leur virement de bonne foi. L'application ne vérifie pas le paiement bancaire : consultez votre compte pour le confirmer.",
    freeEyebrow: "COMMENCEZ AUJOURD'HUI",
    freeTitle: "Offrez une carte musicale à votre prochain concert.",
    freeDescription: "Créez un compte et préparez votre profil sans frais. Music Menu est gratuit pour le moment.",
    footerLine: "La musique live plus proche de votre public.",
  },
};

const stepIcons = [ListMusic, CalendarDays, QrCode, Radio] as const;
const benefitIcons = [Music2, QrCode, Smartphone] as const;

export function MusicianLanding() {
  const { locale, t } = useLocale();
  const lastMenu = useLastMenu();
  const content = copy[locale];
  const accountHref = isDemo ? "/ingresar" : "/ingresar?mode=register";

  return <div className="space-y-24 pb-10 sm:space-y-32">
    <section className="grid items-center gap-10 py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:gap-16 lg:py-16" aria-labelledby="landing-title">
      <div>
        {lastMenu && <Link href={menuHref(lastMenu.slug)} className="mb-7 inline-flex min-h-12 max-w-full items-center gap-3 rounded-control border border-border bg-surface-subtle px-4 py-2.5 text-sm font-semibold hover:bg-surface-hover">
          <Music2 size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{t("Back to the menu")} · {lastMenu.stageName}</span>
          <ArrowRight size={17} className="shrink-0" aria-hidden="true" />
        </Link>}
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-muted">{content.eyebrow}</p>
        <h1 id="landing-title" className="max-w-2xl text-[clamp(3.25rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.07em]">
          <span className="block">{content.headline[0]}</span>
          <span className="block text-muted">{content.headline[1]}</span>
        </h1>
        <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">{content.introduction}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={accountHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-action px-6 py-3 text-sm font-semibold text-action-foreground transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            {isDemo ? content.demoCta : content.createAccount}<ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/ingresar" className="inline-flex min-h-12 items-center justify-center rounded-control border border-border px-6 py-3 text-sm font-semibold hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">{content.signIn}</Link>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Check size={15} aria-hidden="true" />{content.freeNote}</p>
        <a href="#como-funciona" className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">{content.explore}<ArrowRight size={16} aria-hidden="true" /></a>
      </div>
      <div className="relative overflow-hidden rounded-sheet bg-surface-inverse p-5 text-inverse sm:p-8" aria-hidden="true">
        <div className="absolute -right-24 -top-24 size-72 rounded-full border border-inverse/20 sm:size-96" />
        <div className="absolute -right-12 -top-12 size-72 rounded-full border border-inverse/20 sm:size-96" />
        <div className="relative flex items-center justify-between border-b border-inverse/25 pb-6">
          <BrandMark light className="size-12" />
          <span className="rounded-full border border-inverse/30 px-3 py-1 text-[10px] font-bold tracking-[0.15em]">{content.previewLabel}</span>
        </div>
        <div className="relative mt-14 max-w-sm rounded-sheet bg-surface p-5 text-foreground shadow-overlay sm:p-7">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.15em] text-muted">{content.previewQueue}</p><p className="mt-2 text-xl font-semibold leading-tight">{content.previewShow}</p></div><Radio className="shrink-0" size={19}/></div>
          <div className="mt-7 flex items-center gap-3 rounded-control border border-border p-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-hover"><Music2 size={19}/></span><div className="min-w-0"><p className="text-sm font-semibold">{content.previewRequest}</p><p className="text-xs text-muted">{content.previewDedication}</p></div><span className="ml-auto size-2 shrink-0 rounded-full bg-foreground" /></div>
          <div className="mt-3 flex items-center gap-3 rounded-control border border-border p-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-hover"><Heart size={19}/></span><div className="min-w-0"><p className="text-sm font-semibold">{content.previewRequest}</p><p className="text-xs text-muted">{content.previewQueue}</p></div><span className="ml-auto size-2 shrink-0 rounded-full bg-foreground" /></div>
        </div>
        <div className="relative mt-6 flex items-center justify-end gap-3 text-sm"><QrCode size={22}/><span>{content.previewQr}</span></div>
      </div>
    </section>

    <section id="como-funciona" className="scroll-mt-28" aria-labelledby="how-title">
      <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">{content.howEyebrow}</p><h2 id="how-title" className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{content.howTitle}</h2><p className="mt-4 text-base leading-7 text-muted">{content.howIntroduction}</p></div>
      <ol className="mt-9 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {content.steps.map((step, index) => { const Icon = stepIcons[index]; return <li key={index} className="flex flex-col rounded-card border border-border p-5 sm:p-6"><div className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-control bg-surface-hover"><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></span><span className="text-xs font-semibold text-muted">0{index + 1}</span></div><h3 className="mt-8 text-lg font-semibold leading-snug">{step.title}</h3><p className="mt-3 text-sm leading-6 text-muted">{step.description}</p></li>; })}
      </ol>
    </section>

    <section className="border-t border-border pt-14" aria-labelledby="benefits-title">
      <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">{content.benefitsEyebrow}</p><h2 id="benefits-title" className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{content.benefitsTitle}</h2></div>
      <div className="mt-9 grid gap-7 md:grid-cols-3">{content.benefits.map((benefit, index) => { const Icon = benefitIcons[index]; return <div key={index} className="border-t border-foreground pt-5"><Icon size={23} strokeWidth={1.6} aria-hidden="true" /><h3 className="mt-6 text-xl font-semibold">{benefit.title}</h3><p className="mt-3 text-sm leading-6 text-muted">{benefit.description}</p></div>; })}</div>
      <p className="mt-10 max-w-3xl rounded-card bg-surface-hover p-5 text-sm leading-6 text-muted">{content.paymentNote}</p>
    </section>

    <section className="rounded-sheet bg-surface-inverse px-6 py-10 text-inverse sm:px-10 sm:py-14 lg:flex lg:items-end lg:justify-between lg:gap-10" aria-labelledby="free-title">
      <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-inverse/60">{content.freeEyebrow}</p><h2 id="free-title" className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">{content.freeTitle}</h2><p className="mt-5 text-sm leading-7 text-inverse/70 sm:text-base">{content.freeDescription}</p></div>
      <Link href={accountHref} className="mt-8 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-control bg-surface px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse lg:mt-0">{isDemo ? content.demoCta : content.createAccount}<ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
    <p className="text-center text-sm text-muted">{content.footerLine}</p>
  </div>;
}
