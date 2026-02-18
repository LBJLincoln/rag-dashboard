import { Building2 } from 'lucide-react'
import type { Sector } from '@/types/sector'

export const PME_SECTOR: Sector = {
  id: 'pme-usecases',
  name: 'Votre Entreprise',
  description: '200 cas d\'usage concrets pour automatiser votre PME/ETI.',
  icon: Building2,
  color: '#0a84ff',
  colorVar: 'var(--ac)',
  gradient: 'from-blue-500/20 to-blue-600/5',
  painPoint: '200 taches automatisables',
  painPointSub: '10 categories metier, ROI mesure — trouvez votre automatisation en 30 secondes.',
  roiPrimary: '10 categories',
  roiSecondary: '200 cas',
  roiThird: '65K EUR/an moyen',
  metrics: [
    { label: 'Categories', value: '10' },
    { label: 'Cas d\'usage', value: '200' },
    { label: 'ROI moyen', value: '65K/an' },
  ],
  useCases: [
    {
      question: 'Relance tous les devis sans reponse depuis plus de 48h avec un email personnalise.',
      label: 'Relance devis',
      roi: '120K EUR/an',
      description: 'Detection automatique des devis sans reponse et envoi d\'emails de relance personnalises.',
    },
    {
      question: 'Genere le compte-rendu de la reunion de ce matin avec les actions et responsables.',
      label: 'CR reunion',
      roi: '25K EUR/an',
      description: 'Generation automatique de comptes-rendus structures avec actions et responsables.',
    },
    {
      question: 'Analyse les 50 CV recus pour le poste de Developpeur Senior et genere une shortlist top 10.',
      label: 'Pre-selection CV',
      roi: '40K EUR/an',
      description: 'Tri et scoring automatique des CV par pertinence avec la fiche de poste.',
    },
    {
      question: 'Envoie une relance de niveau 2 pour toutes les factures impayees a plus de 30 jours.',
      label: 'Relance factures',
      roi: '80K EUR/an',
      description: 'Detection et relance automatique des factures impayees avec graduation du ton.',
    },
    {
      question: 'Quelles machines necessitent une maintenance preventive cette semaine selon les indicateurs ?',
      label: 'Maintenance',
      roi: '150K EUR/an',
      description: 'Analyse predictive des indicateurs machines pour planifier la maintenance avant panne.',
    },
  ],
}

export const PME_PAIN_POINTS = [
  { text: 'Votre equipe commerciale oublie 60% des relances devis', color: '#0a84ff' },
  { text: 'Les comptes-rendus de reunion ne sont jamais rediges', color: '#30d158' },
  { text: 'Vos factures impayees ne sont relancees qu\'a 60 jours', color: '#ff453a' },
  { text: '80% des CV recus ne correspondent pas au poste', color: '#bf5af2' },
]
