export interface AppConnector {
  id: string
  name: string
  category: 'communication' | 'crm' | 'productivite' | 'finance'
  color: string
  icon: string
  capabilities: string[]
}
