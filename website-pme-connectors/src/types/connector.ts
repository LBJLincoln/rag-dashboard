export interface AppConnector {
  id: string
  name: string
  category: 'communication' | 'crm' | 'productivite' | 'finance' | 'stockage'
  color: string
  abbr: string
  capabilities: string[]
}
