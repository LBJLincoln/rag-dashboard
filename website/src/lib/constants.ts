import { HardHat, Factory, TrendingUp, Scale } from 'lucide-react'
import type { Sector } from '@/types/sector'

export const SECTORS: Sector[] = [
  {
    id: 'btp',
    name: 'BTP & Construction',
    description:
      'Normes DTU, reglementations, CCTP et specifications techniques du batiment.',
    icon: HardHat,
    color: '#4C8BF5',
    colorVar: 'var(--ac)',
    gradient: 'from-blue-500/20 to-blue-600/5',
    painPoint: '3 heures perdues par jour',
    painPointSub: 'à chercher des informations techniques sur vos chantiers',
    roiPrimary: '+20% productivité',
    roiSecondary: 'Zéro oubli de norme',
    roiThird: 'Devis plus justes',
    metrics: [
      { label: 'Documents indexes', value: '2,400+' },
      { label: 'Precision', value: '92%' },
      { label: 'Temps de reponse', value: '<3s' },
    ],
    useCases: [
      {
        question: 'Quelles sont les normes DTU pour l\'isolation thermique des murs exterieurs ?',
        label: 'Normes DTU',
        roi: '-70% temps recherche',
      },
      {
        question: 'Quels sont les seuils reglementaires RE2020 pour un batiment tertiaire ?',
        label: 'RE2020',
        roi: 'Conformite garantie',
      },
      {
        question: 'Comment rediger un CCTP pour un lot plomberie ?',
        label: 'CCTP',
        roi: '-50% redaction',
      },
      {
        question: 'Quelles verifications CSPS sont obligatoires avant la reception d\'un chantier de demolition ?',
        label: 'Securite chantier',
        roi: '-35% risques accidents',
      },
      {
        question: 'Comment calculer le Bbio max d\'un projet de logement collectif en zone H2b ?',
        label: 'Calcul thermique',
        roi: '2.4M EUR/an ROI',
      },
    ],
    videoScript: [
      { time: '0-5s', voice: '« Vos équipes perdent 3 heures par jour à chercher des informations ? »', screen: '[3H/JOUR PERDUES] Recherche d\'infos technique' },
      { time: '5-12s', voice: '« Notre IA RAG répond en 3 secondes. Un DTU, un CCAP, un plan de chantier : elle trouve l\'info exacte dans vos milliers de documents. »', screen: '[RÉPONSE EN 3 SECONDES] DTU • CCAP • Plans • Vos documents internes' },
      { time: '12-19s', voice: '« Résultat : moins d\'erreurs de devis, zéro oubli de norme, et vos chantiers livrés dans les délais. »', screen: '[ROI CONCRET] Devis plus justes / Conformité garantie / Délais tenus' },
      { time: '19-25s', voice: '« Les ETI du BTP gagnent 20% de productivité. Vos équipes se concentrent sur l\'exécution, pas la paperasse. »', screen: '[+20% PRODUCTIVITÉ] BTP & Construction' },
      { time: '25-30s', voice: '« Démo personnalisée sur vos propres documents. Réservez votre créneau. »', screen: '[DÉMO GRATUITE] 30 min, vos docs, vos cas d\'usage' },
    ],
  },
  {
    id: 'industrie',
    name: 'Industrie',
    description:
      'Maintenance predictive, fiches techniques, procedures qualite et certifications ISO.',
    icon: Factory,
    color: '#30D982',
    colorVar: 'var(--gn)',
    gradient: 'from-green-500/20 to-green-600/5',
    painPoint: '2 heures perdues par jour',
    painPointSub: 'soit 15 000 € par an et par technicien en coût caché',
    roiPrimary: '-30% pannes',
    roiSecondary: 'Zéro retard certification',
    roiThird: 'MTTR réduit de moitié',
    metrics: [
      { label: 'Fiches techniques', value: '1,800+' },
      { label: 'Precision', value: '89%' },
      { label: 'Temps de reponse', value: '<4s' },
    ],
    useCases: [
      {
        question: 'Quelle est la procedure de maintenance preventive pour un compresseur Atlas Copco GA30+ ?',
        label: 'Maintenance',
        roi: '-40% arrets non planifies',
      },
      {
        question: 'Quelles sont les exigences ISO 9001:2015 pour la maitrise des documents ?',
        label: 'ISO 9001',
        roi: 'Audit-ready',
      },
      {
        question: 'Comment calibrer un capteur de pression differentielle ?',
        label: 'Calibration',
        roi: '-60% temps calibration',
      },
      {
        question: 'Quelles sont les obligations de l\'exploitant pour un site classe Seveso seuil haut ?',
        label: 'Seveso/ICPE',
        roi: 'Zero non-conformite',
      },
      {
        question: 'Comment realiser une analyse AMDEC sur une ligne de production automobile ?',
        label: 'AMDEC/FMEA',
        roi: '2.5M EUR/an ROI',
      },
    ],
    videoScript: [
      { time: '0-5s', voice: '« Vos équipes perdent 2 heures par jour à chercher des informations techniques ? »', screen: '2h/jour perdues → Coût caché : 15 000€/an par technicien' },
      { time: '5-11s', voice: '« Notre IA donne la réponse en 3 secondes. Manuels, procédures ATEX, fiches sécurité : tout est accessible instantanément. »', screen: '3 secondes vs 2 heures' },
      { time: '11-17s', voice: '« Maintenance préventive : vos techniciens ont les bonnes procédures, immédiatement. Résultat : 30% moins de pannes imprévues. »', screen: '−30% de pannes / MTTR réduit de moitié' },
      { time: '17-23s', voice: '« Qualité et conformité : une non-conformité ? Le chatbot trace la procédure corrective en temps réel. Zéro retard de certification. »', screen: 'Zéro retard audit / 100% traçable' },
      { time: '23-28s', voice: '« Déployé en 48h. ROI mesurable dès le premier mois. Demandez votre démo gratuite. »', screen: 'ROI 1er mois / Démo gratuite' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    description:
      'Analyse financiere, reglementations bancaires, ratios et reporting IFRS.',
    icon: TrendingUp,
    color: '#F5B731',
    colorVar: 'var(--yl)',
    gradient: 'from-yellow-500/20 to-yellow-600/5',
    painPoint: '40% du temps en veille réglementaire',
    painPointSub: 'AMF, BCE, Bâle III — une lecture manuelle chronophage et risquée',
    roiPrimary: '+12h/semaine',
    roiSecondary: '-60% risque réglementaire',
    roiThird: 'KYC 4x plus vite',
    metrics: [
      { label: 'Rapports indexes', value: '3,200+' },
      { label: 'Precision', value: '94%' },
      { label: 'Temps de reponse', value: '<2s' },
    ],
    useCases: [
      {
        question: 'Quels sont les ratios prudentiels Bale III pour une banque de detail ?',
        label: 'Bale III',
        roi: 'Conformite regulatoire',
      },
      {
        question: 'Comment calculer le ratio de liquidite LCR selon les normes europeennes ?',
        label: 'LCR',
        roi: '-80% temps calcul',
      },
      {
        question: 'Quelles sont les nouvelles regles IFRS 17 pour les contrats d\'assurance ?',
        label: 'IFRS 17',
        roi: 'Mise en conformite',
      },
      {
        question: 'Quel est l\'impact d\'une hausse de 50bps du taux directeur sur notre portefeuille obligataire ?',
        label: 'Stress test',
        roi: '3.5M EUR/an ROI',
      },
      {
        question: 'Quelles sont les exigences KYC renforcees pour les PPE dans le cadre de la 6e directive AML ?',
        label: 'KYC/AML',
        roi: '-90% risque sanction',
      },
    ],
    videoScript: [
      { time: '0-5s', voice: '« Vos équipes passent encore des heures à fouiller vos réglementations ? »', screen: '[Votre temps, c\'est de l\'argent.]' },
      { time: '5-12s', voice: '« Notre IA RAG répond en 3 secondes sur AMF, BCE, Bâle III. KYC validé 4 fois plus vite. Zéro erreur de conformité. »', screen: '[AMF • BCE • Bâle III] / [KYC : -75% de temps] / [Conformité : 0 erreur]' },
      { time: '12-19s', voice: '« Contrats clients, rapports d\'audit, analyses financières : tout devient accessible, instantanément. »', screen: '[100% de vos documents] / [1 question = 1 réponse]' },
      { time: '19-26s', voice: '« Résultat ? Vos équipes gagnent 12 heures par semaine. Vous réduisez vos risques réglementaires de 60%. »', screen: '[+12h/semaine gagnées] / [-60% de risque]' },
      { time: '26-30s', voice: '« Démonstration personnalisée. Cette semaine. »', screen: '[Réservez votre démo →]' },
    ],
  },
  {
    id: 'juridique',
    name: 'Juridique',
    description:
      'Code civil, jurisprudence, contrats types et veille reglementaire.',
    icon: Scale,
    color: '#F08838',
    colorVar: 'var(--or)',
    gradient: 'from-orange-500/20 to-orange-600/5',
    painPoint: '40% du temps en recherche',
    painPointSub: 'jurisprudence, codes, doctrine — introuvable en moins d\'une heure',
    roiPrimary: '-15h par dossier',
    roiSecondary: '+35% productivité',
    roiThird: 'Zéro sanction',
    metrics: [
      { label: 'Articles de loi', value: '5,000+' },
      { label: 'Precision', value: '91%' },
      { label: 'Temps de reponse', value: '<3s' },
    ],
    useCases: [
      {
        question: 'Quelles sont les obligations de l\'employeur en matiere de teletravail selon le Code du travail ?',
        label: 'Teletravail',
        roi: '-60% recherche juridique',
      },
      {
        question: 'Quels sont les delais de prescription en matiere contractuelle ?',
        label: 'Prescription',
        roi: 'Securite juridique',
      },
      {
        question: 'Comment rediger une clause de non-concurrence conforme a la jurisprudence ?',
        label: 'Non-concurrence',
        roi: '-50% revision contrats',
      },
      {
        question: 'Quelles clauses du contrat de sous-traitance presentent un risque de requalification en salariat deguise ?',
        label: 'Analyse contrats',
        roi: '3.2M EUR/an ROI',
      },
      {
        question: 'Quel est l\'etat actuel de la jurisprudence sur le devoir de vigilance des societes meres (loi Sapin II) ?',
        label: 'Compliance',
        roi: 'Zero risque penal',
      },
    ],
    videoScript: [
      { time: '0-5s', voice: '« Vos juristes passent 40% de leur temps à chercher des informations. »', screen: '40% du temps perdu en recherche' },
      { time: '5-10s', voice: '« Interrogez la jurisprudence en 3 secondes. 15 heures de recherche économisées par dossier. »', screen: 'Jurisprudence instantanée | -15h par dossier' },
      { time: '10-15s', voice: '« Veille réglementaire RGPD et droit des sociétés en temps réel. Zéro sanction évitée. »', screen: 'Conformité temps réel | Zéro risque' },
      { time: '15-20s', voice: '« Contrats types et clauses générés instantanément. ROI : +35% de productivité juridique. »', screen: 'Contrats instantanés | +35% productivité' },
      { time: '20-30s', voice: '« Déjà 80 cabinets et directions juridiques nous font confiance. Démo personnalisée sous 48h. »', screen: '80+ cabinets équipés / Démonstration sous 48h' },
    ],
  },
]
