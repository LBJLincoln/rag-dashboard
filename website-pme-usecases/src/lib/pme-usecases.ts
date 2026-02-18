export interface PMEUseCaseDetail {
  id: string
  title: string
  category: string
  problem: string
  description: string
  apps: string[]
  impact: 'fort' | 'moyen' | 'critique'
  roiAnnuel: string
  roiAmount: number
  timeSaved: string
  chatbotQuery: string
}

export interface PMECategory {
  id: string
  label: string
  color: string
  emoji: string
}

export const PME_CATEGORIES: PMECategory[] = [
  { id: 'commercial', label: 'Commercial', color: '#0a84ff', emoji: '💼' },
  { id: 'admin', label: 'Administration', color: '#30d158', emoji: '📋' },
  { id: 'rh', label: 'RH', color: '#bf5af2', emoji: '👥' },
  { id: 'finance', label: 'Finance', color: '#ffd60a', emoji: '💰' },
  { id: 'communication', label: 'Communication', color: '#ff375f', emoji: '📢' },
  { id: 'logistique', label: 'Logistique', color: '#ff9f0a', emoji: '🚚' },
  { id: 'juridique', label: 'Juridique', color: '#64d2ff', emoji: '⚖️' },
  { id: 'support', label: 'Support Client', color: '#30d158', emoji: '🎧' },
  { id: 'production', label: 'Production', color: '#ff453a', emoji: '🏭' },
  { id: 'direction', label: 'Direction', color: '#5ac8fa', emoji: '📊' },
]

export const PME_USECASES: PMEUseCaseDetail[] = [
  // Commercial (2)
  {
    id: 'com-1',
    title: 'Relance devis automatique',
    category: 'commercial',
    problem: 'Les devis non relances dans les 48h ont 60% de chances d\'etre perdus. Vos commerciaux oublient.',
    description: 'Le chatbot detecte les devis sans reponse depuis 48h dans le CRM, genere un email de relance personnalise et l\'envoie automatiquement avec le devis en PJ.',
    apps: ['HubSpot', 'Gmail', 'Drive'],
    impact: 'critique',
    roiAnnuel: '120 000 EUR/an',
    roiAmount: 120000,
    timeSaved: '45 min/devis',
    chatbotQuery: 'Relance tous les devis sans reponse depuis plus de 48h avec un email personnalise.',
  },
  {
    id: 'com-2',
    title: 'Briefing RDV client',
    category: 'commercial',
    problem: 'Vos commerciaux arrivent en RDV sans contexte : dernier echange, historique commandes, litiges ouverts.',
    description: 'Avant chaque RDV, le chatbot compile le brief client : derniers echanges, CA, commandes en cours, litiges — envoye sur Slack 1h avant.',
    apps: ['Salesforce', 'Slack', 'Calendar'],
    impact: 'fort',
    roiAnnuel: '65 000 EUR/an',
    roiAmount: 65000,
    timeSaved: '30 min/RDV',
    chatbotQuery: 'Prepare un briefing complet pour mon prochain RDV client avec historique CRM et derniers echanges.',
  },
  // Admin (2)
  {
    id: 'admin-1',
    title: 'Tri emails automatique',
    category: 'admin',
    problem: 'La boite email de l\'entreprise recoit 200+ emails/jour. 60% sont du spam ou des notifications non urgentes.',
    description: 'Le chatbot trie les emails entrants, classe les urgents, resume les importants et archive le reste. Resume quotidien envoye a 9h.',
    apps: ['Gmail', 'Slack', 'Notion'],
    impact: 'fort',
    roiAnnuel: '35 000 EUR/an',
    roiAmount: 35000,
    timeSaved: '1h30/jour',
    chatbotQuery: 'Trie ma boite email du jour : urgents, importants, et a archiver. Envoie-moi un resume.',
  },
  {
    id: 'admin-2',
    title: 'Compte-rendu reunion automatique',
    category: 'admin',
    problem: 'Apres chaque reunion, personne ne redige le CR. Les decisions se perdent, les actions ne sont pas suivies.',
    description: 'Le chatbot genere un CR structure a partir des notes de reunion : decisions, actions, responsables, deadlines. Poste automatiquement sur Notion.',
    apps: ['Notion', 'Calendar', 'Slack'],
    impact: 'moyen',
    roiAnnuel: '25 000 EUR/an',
    roiAmount: 25000,
    timeSaved: '20 min/reunion',
    chatbotQuery: 'Genere le compte-rendu de la reunion de ce matin avec les actions et responsables.',
  },
  // RH (2)
  {
    id: 'rh-1',
    title: 'Pre-selection CV automatique',
    category: 'rh',
    problem: 'Votre RH passe 3h par poste ouvert a trier des CV. 80% sont hors sujet.',
    description: 'Le chatbot analyse les CV recus, les compare a la fiche de poste, classe par pertinence et genere une shortlist avec scoring.',
    apps: ['Gmail', 'Drive', 'Notion'],
    impact: 'fort',
    roiAnnuel: '40 000 EUR/an',
    roiAmount: 40000,
    timeSaved: '2h30/poste',
    chatbotQuery: 'Analyse les 50 CV recus pour le poste de Developpeur Senior et genere une shortlist top 10.',
  },
  {
    id: 'rh-2',
    title: 'FAQ salaries automatisee',
    category: 'rh',
    problem: 'Les salaries posent les memes questions RH 20 fois par mois : conges, mutuelle, teletravail, notes de frais.',
    description: 'Le chatbot repond automatiquement aux questions RH recurrentes en se basant sur le reglement interieur et les politiques internes.',
    apps: ['Slack', 'Notion', 'Drive'],
    impact: 'moyen',
    roiAnnuel: '30 000 EUR/an',
    roiAmount: 30000,
    timeSaved: '5h/semaine',
    chatbotQuery: 'Combien de jours de teletravail ai-je droit par semaine selon la politique interne ?',
  },
  // Finance (2)
  {
    id: 'fin-1',
    title: 'Rapprochement bancaire automatique',
    category: 'finance',
    problem: 'Le rapprochement bancaire mensuel prend 2 jours. Erreurs frequentes, ecarts non expliques.',
    description: 'Le chatbot compare les releves bancaires avec les ecritures comptables, identifie les ecarts et propose les corrections.',
    apps: ['Sage', 'Drive', 'Slack'],
    impact: 'fort',
    roiAnnuel: '55 000 EUR/an',
    roiAmount: 55000,
    timeSaved: '1.5 jours/mois',
    chatbotQuery: 'Compare le releve bancaire de janvier avec nos ecritures Sage et identifie les ecarts.',
  },
  {
    id: 'fin-2',
    title: 'Relance factures impayees',
    category: 'finance',
    problem: 'Les factures impayees a 30 jours ne sont relancees qu\'a 60 jours. 15% du CA est en retard de paiement.',
    description: 'Le chatbot detecte les factures echues, genere des emails de relance gradues (courtois → ferme → mise en demeure) et les envoie automatiquement.',
    apps: ['Stripe', 'Gmail', 'Sage'],
    impact: 'critique',
    roiAnnuel: '80 000 EUR/an',
    roiAmount: 80000,
    timeSaved: '3h/semaine',
    chatbotQuery: 'Envoie une relance de niveau 2 pour toutes les factures impayees a plus de 30 jours.',
  },
  // Communication (2)
  {
    id: 'comm-1',
    title: 'Posts LinkedIn automatiques',
    category: 'communication',
    problem: 'Vous savez que LinkedIn est important mais personne n\'a le temps de rediger 3 posts par semaine.',
    description: 'Le chatbot genere des posts LinkedIn professionnels bases sur vos actualites, articles de veille et cas clients. Planification automatique.',
    apps: ['Notion', 'Calendar', 'Drive'],
    impact: 'moyen',
    roiAnnuel: '15 000 EUR/an',
    roiAmount: 15000,
    timeSaved: '2h/semaine',
    chatbotQuery: 'Genere 3 posts LinkedIn pour cette semaine bases sur nos dernieres actualites et cas clients.',
  },
  {
    id: 'comm-2',
    title: 'Newsletter automatique',
    category: 'communication',
    problem: 'La newsletter mensuelle est toujours en retard. Contenu generique, pas de personnalisation, faible taux d\'ouverture.',
    description: 'Le chatbot compile les contenus du mois (articles, cas clients, actus), redige la newsletter et la segmente par audience.',
    apps: ['Notion', 'Gmail', 'HubSpot'],
    impact: 'moyen',
    roiAnnuel: '12 000 EUR/an',
    roiAmount: 12000,
    timeSaved: '4h/mois',
    chatbotQuery: 'Compile les contenus de fevrier et genere la newsletter mensuelle segmentee par audience.',
  },
  // Logistique (2)
  {
    id: 'log-1',
    title: 'Alertes livraison proactives',
    category: 'logistique',
    problem: 'Les clients decouvrent les retards de livraison au dernier moment. Appels colere, perte de confiance.',
    description: 'Le chatbot surveille les statuts de livraison et alerte proactivement les clients par WhatsApp/email en cas de retard prevu.',
    apps: ['WhatsApp', 'Gmail', 'Notion'],
    impact: 'critique',
    roiAnnuel: '90 000 EUR/an',
    roiAmount: 90000,
    timeSaved: '1h/jour',
    chatbotQuery: 'Identifie toutes les livraisons en retard et envoie une notification proactive aux clients concernes.',
  },
  {
    id: 'log-2',
    title: 'Reapprovisionnement stocks automatique',
    category: 'logistique',
    problem: 'Les ruptures de stock arrivent sans prevenir. Les commandes d\'urgence coutent 30% plus cher.',
    description: 'Le chatbot analyse les niveaux de stock, predit les ruptures et declenche automatiquement les commandes de reapprovisionnement.',
    apps: ['Sage', 'Gmail', 'Notion'],
    impact: 'critique',
    roiAnnuel: '110 000 EUR/an',
    roiAmount: 110000,
    timeSaved: '5h/semaine',
    chatbotQuery: 'Analyse les niveaux de stock actuels et declenche les reapprovisionnements pour les produits sous le seuil.',
  },
  // Juridique (2)
  {
    id: 'jur-1',
    title: 'Veille reglementaire automatique',
    category: 'juridique',
    problem: 'Les changements reglementaires passent inapercus. Risque de non-conformite et sanctions.',
    description: 'Le chatbot surveille les publications officielles (JORF, EUR-Lex) et alerte sur les changements impactant votre secteur.',
    apps: ['Notion', 'Slack', 'Gmail'],
    impact: 'fort',
    roiAnnuel: '60 000 EUR/an',
    roiAmount: 60000,
    timeSaved: '6h/semaine',
    chatbotQuery: 'Quels changements reglementaires de ce mois impactent notre activite ? Resume et actions requises.',
  },
  {
    id: 'jur-2',
    title: 'Generation contrats types',
    category: 'juridique',
    problem: 'Chaque contrat est redige from scratch. 4h par contrat, risque d\'oubli de clauses obligatoires.',
    description: 'Le chatbot genere des contrats types personnalises a partir de vos modeles et des informations client, avec clauses obligatoires verifiees.',
    apps: ['Drive', 'HubSpot', 'Notion'],
    impact: 'fort',
    roiAnnuel: '45 000 EUR/an',
    roiAmount: 45000,
    timeSaved: '3h/contrat',
    chatbotQuery: 'Genere un contrat de prestation pour le client ABC Consulting avec les conditions standard.',
  },
  // Support (2)
  {
    id: 'sup-1',
    title: 'Reponse reclamations automatique',
    category: 'support',
    problem: 'Les reclamations clients mettent 72h a obtenir une reponse. Le client est deja parti chez le concurrent.',
    description: 'Le chatbot analyse la reclamation, identifie le probleme, propose une resolution et redige la reponse — soumise pour validation.',
    apps: ['Gmail', 'HubSpot', 'Slack'],
    impact: 'fort',
    roiAnnuel: '50 000 EUR/an',
    roiAmount: 50000,
    timeSaved: '25 min/reclamation',
    chatbotQuery: 'Analyse cette reclamation client et propose une reponse avec solution de resolution.',
  },
  {
    id: 'sup-2',
    title: 'FAQ dynamique client',
    category: 'support',
    problem: 'Le support repond aux memes 20 questions 80% du temps. Les agents qualifies sont gaspilles sur du repetitif.',
    description: 'Le chatbot gere automatiquement les questions frequentes avec des reponses personnalisees basees sur le compte client.',
    apps: ['WhatsApp', 'HubSpot', 'Notion'],
    impact: 'critique',
    roiAnnuel: '70 000 EUR/an',
    roiAmount: 70000,
    timeSaved: '3h/jour',
    chatbotQuery: 'Ou en est ma commande numero 12345 ? Quand est-ce que je vais recevoir mon colis ?',
  },
  // Production (2)
  {
    id: 'prod-1',
    title: 'Rapport non-conformite automatique',
    category: 'production',
    problem: 'Les rapports de non-conformite sont rediges a la main, incomplets, et classes dans un tiroir.',
    description: 'Le chatbot genere le rapport structure (cause, impact, action corrective, responsable, deadline) et le distribue aux parties prenantes.',
    apps: ['Notion', 'Slack', 'Drive'],
    impact: 'fort',
    roiAnnuel: '35 000 EUR/an',
    roiAmount: 35000,
    timeSaved: '1h/rapport',
    chatbotQuery: 'Genere un rapport de non-conformite pour le lot 2024-156 avec cause racine et action corrective.',
  },
  {
    id: 'prod-2',
    title: 'Maintenance preventive intelligente',
    category: 'production',
    problem: 'Les pannes machines coutent 5000 EUR/h d\'arret. La maintenance preventive est basee sur le calendrier, pas sur l\'etat reel.',
    description: 'Le chatbot analyse les indicateurs machines (vibrations, temperature, heures) et recommande les interventions avant la panne.',
    apps: ['Notion', 'Calendar', 'Slack'],
    impact: 'critique',
    roiAnnuel: '150 000 EUR/an',
    roiAmount: 150000,
    timeSaved: '2h/semaine',
    chatbotQuery: 'Quelles machines necessitent une maintenance preventive cette semaine selon les indicateurs actuels ?',
  },
  // Direction (2)
  {
    id: 'dir-1',
    title: 'Tableau de bord hebdomadaire',
    category: 'direction',
    problem: 'Le comite de direction n\'a pas de vision consolidee. Chaque service envoie ses chiffres dans un format different.',
    description: 'Le chatbot consolide les KPIs de tous les services (CA, tresorerie, production, RH) et genere un dashboard envoye chaque lundi a 8h.',
    apps: ['Sage', 'HubSpot', 'Slack'],
    impact: 'fort',
    roiAnnuel: '85 000 EUR/an',
    roiAmount: 85000,
    timeSaved: '4h/semaine',
    chatbotQuery: 'Genere le tableau de bord hebdomadaire avec KPIs consolides de tous les services.',
  },
  {
    id: 'dir-2',
    title: 'Analyse concurrentielle automatique',
    category: 'direction',
    problem: 'Vous n\'avez aucune veille concurrentielle structuree. Les mouvements du marche vous surprennent.',
    description: 'Le chatbot surveille les actualites des concurrents (presse, LinkedIn, BODACC) et genere un rapport mensuel avec alertes urgentes.',
    apps: ['Notion', 'Slack', 'Gmail'],
    impact: 'moyen',
    roiAnnuel: '40 000 EUR/an',
    roiAmount: 40000,
    timeSaved: '6h/mois',
    chatbotQuery: 'Genere le rapport de veille concurrentielle du mois avec les mouvements cles du marche.',
  },
]

// Total: 20 use cases (2 par categorie)
// Structure pour les 180 restants: meme format, a completer
export const TOTAL_TARGET = 200
export const CURRENT_COUNT = PME_USECASES.length
export const REMAINING = TOTAL_TARGET - CURRENT_COUNT
