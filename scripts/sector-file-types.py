#!/usr/bin/env python3
"""
Sector File Types — Comprehensive mapping of 500 document types across 4 sectors
Author: Claude Opus 4.6
Created: 2026-02-20
"""

from typing import Dict, List, Optional, Any
import re

SECTOR_FILE_TYPES = {
    "BTP": {
        "types": [
            # Marchés publics (25 types)
            {
                "id": "btp_001",
                "name": "Acte d'engagement (AE)",
                "category": "Marchés publics",
                "format": ["PDF"],
                "avg_pages": 10,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["entreprise", "montant", "date", "lot"],
                "keywords_fr": ["acte d'engagement", "marché public", "soumissionnaire", "prix forfaitaire"]
            },
            {
                "id": "btp_002",
                "name": "CCAP (Cahier des Clauses Administratives Particulières)",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 45,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["délai", "pénalité", "garantie", "clause"],
                "keywords_fr": ["ccap", "clauses administratives", "conditions d'exécution"]
            },
            {
                "id": "btp_003",
                "name": "CCTP (Cahier des Clauses Techniques Particulières)",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 80,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["norme", "matériau", "dimension", "performance"],
                "keywords_fr": ["cctp", "clauses techniques", "prescriptions techniques"]
            },
            {
                "id": "btp_004",
                "name": "DPGF (Détail Quantitatif et Estimatif)",
                "category": "Marchés publics",
                "format": ["PDF", "XLSX", "XLS"],
                "avg_pages": 25,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["quantité", "prix unitaire", "montant total", "poste"],
                "keywords_fr": ["dpgf", "bordereau", "prix unitaires", "quantités"]
            },
            {
                "id": "btp_005",
                "name": "RC (Règlement de Consultation)",
                "category": "Marchés publics",
                "format": ["PDF"],
                "avg_pages": 15,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["candidature", "critère", "jugement", "date limite"],
                "keywords_fr": ["règlement de consultation", "critères de sélection", "candidatures"]
            },
            {
                "id": "btp_006",
                "name": "DQE (Décomposition du Prix Global et Forfaitaire)",
                "category": "Marchés publics",
                "format": ["XLSX", "PDF"],
                "avg_pages": 30,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["décomposition", "sous-détail", "coefficient"],
                "keywords_fr": ["dqe", "décomposition", "prix forfaitaire"]
            },
            {
                "id": "btp_007",
                "name": "Avis de marché",
                "category": "Marchés publics",
                "format": ["PDF"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["publication", "procédure", "pouvoir adjudicateur"],
                "keywords_fr": ["avis de marché", "publication", "joue", "boamp"]
            },
            {
                "id": "btp_008",
                "name": "Plan Particulier de Sécurité et de Protection de la Santé (PPSPS)",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 50,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["risque", "prévention", "équipement", "mesure"],
                "keywords_fr": ["ppsps", "sécurité", "santé", "coordination"]
            },
            {
                "id": "btp_009",
                "name": "Sous-détail de prix",
                "category": "Marchés publics",
                "format": ["XLSX", "PDF"],
                "avg_pages": 20,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["main d'oeuvre", "matériel", "fourniture", "débours"],
                "keywords_fr": ["sous-détail", "décomposition prix", "analyse de prix"]
            },
            {
                "id": "btp_010",
                "name": "Cahier des Charges",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 40,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["exigence", "spécification", "obligation"],
                "keywords_fr": ["cahier des charges", "exigences", "spécifications"]
            },
            {
                "id": "btp_011",
                "name": "Attestation d'assurance décennale",
                "category": "Marchés publics",
                "format": ["PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["assureur", "garantie", "plafond", "activité"],
                "keywords_fr": ["assurance décennale", "rc pro", "garantie"]
            },
            {
                "id": "btp_012",
                "name": "DC1 - Lettre de candidature",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["candidat", "habilitation", "signature"],
                "keywords_fr": ["dc1", "lettre candidature", "habilitation"]
            },
            {
                "id": "btp_013",
                "name": "DC2 - Déclaration du candidat",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["effectif", "chiffre d'affaires", "références"],
                "keywords_fr": ["dc2", "déclaration candidat", "capacités"]
            },
            {
                "id": "btp_014",
                "name": "Mémoire technique",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 60,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["méthodologie", "moyens", "organisation", "planning"],
                "keywords_fr": ["mémoire technique", "méthodologie", "moyens mis en oeuvre"]
            },
            {
                "id": "btp_015",
                "name": "Attestation fiscale",
                "category": "Marchés publics",
                "format": ["PDF"],
                "avg_pages": 1,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["impôt", "situation", "régularité"],
                "keywords_fr": ["attestation fiscale", "impôts", "régularité"]
            },
            {
                "id": "btp_016",
                "name": "Attestation URSSAF",
                "category": "Marchés publics",
                "format": ["PDF"],
                "avg_pages": 1,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["cotisation", "régularité", "employeur"],
                "keywords_fr": ["urssaf", "cotisations sociales", "vigilance"]
            },
            {
                "id": "btp_017",
                "name": "Registre des prix",
                "category": "Marchés publics",
                "format": ["XLSX", "PDF"],
                "avg_pages": 100,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["prix", "révision", "indexation"],
                "keywords_fr": ["registre prix", "bordereau", "catalogue"]
            },
            {
                "id": "btp_018",
                "name": "Plan d'assurance qualité (PAQ)",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 35,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["contrôle", "point d'arrêt", "essai", "vérification"],
                "keywords_fr": ["paq", "qualité", "contrôle", "point d'arrêt"]
            },
            {
                "id": "btp_019",
                "name": "Cadre de bordereau de prix",
                "category": "Marchés publics",
                "format": ["XLSX", "PDF"],
                "avg_pages": 15,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["unité", "désignation", "prix"],
                "keywords_fr": ["bordereau", "prix unitaire", "désignation"]
            },
            {
                "id": "btp_020",
                "name": "Rapport de présentation",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 20,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["besoin", "justification", "estimation"],
                "keywords_fr": ["rapport présentation", "analyse besoin", "estimation"]
            },
            {
                "id": "btp_021",
                "name": "Notice explicative de sécurité",
                "category": "Marchés publics",
                "format": ["PDF"],
                "avg_pages": 25,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["risque incendie", "évacuation", "dispositif"],
                "keywords_fr": ["notice sécurité", "erp", "incendie"]
            },
            {
                "id": "btp_022",
                "name": "Dossier de Consultation des Entreprises (DCE)",
                "category": "Marchés publics",
                "format": ["PDF", "ZIP"],
                "avg_pages": 200,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["pièce", "document", "annexe"],
                "keywords_fr": ["dce", "consultation", "dossier complet"]
            },
            {
                "id": "btp_023",
                "name": "Procès-verbal d'ouverture des plis",
                "category": "Marchés publics",
                "format": ["PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["candidat", "offre", "commission"],
                "keywords_fr": ["pv ouverture", "plis", "commission"]
            },
            {
                "id": "btp_024",
                "name": "Rapport d'analyse des offres",
                "category": "Marchés publics",
                "format": ["PDF", "DOCX"],
                "avg_pages": 15,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["critère", "notation", "classement"],
                "keywords_fr": ["analyse offres", "critères", "notation"]
            },
            {
                "id": "btp_025",
                "name": "Notification de marché",
                "category": "Marchés publics",
                "format": ["PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["attribution", "titulaire", "montant"],
                "keywords_fr": ["notification", "attribution", "titulaire"]
            },

            # Plans et Dessins (20 types)
            {
                "id": "btp_026",
                "name": "Plan de masse",
                "category": "Plans",
                "format": ["DWG", "PDF", "DXF"],
                "avg_pages": 1,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["échelle", "orientation", "limite parcelle"],
                "keywords_fr": ["plan masse", "implantation", "parcelle"]
            },
            {
                "id": "btp_027",
                "name": "Plan de situation",
                "category": "Plans",
                "format": ["PDF", "DWG"],
                "avg_pages": 1,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["localisation", "cadastre", "voie"],
                "keywords_fr": ["plan situation", "cadastre", "localisation"]
            },
            {
                "id": "btp_028",
                "name": "Plan de coffrage",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["dalle", "poutre", "poteau", "dimension"],
                "keywords_fr": ["coffrage", "béton armé", "structure"]
            },
            {
                "id": "btp_029",
                "name": "Plan de ferraillage",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["acier", "diamètre", "espacement", "ancrage"],
                "keywords_fr": ["ferraillage", "armature", "acier"]
            },
            {
                "id": "btp_030",
                "name": "Plan d'exécution",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 10,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["détail", "coupe", "vue"],
                "keywords_fr": ["plan exécution", "détail", "mise en oeuvre"]
            },
            {
                "id": "btp_031",
                "name": "Plan d'architecte",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 8,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["pièce", "cote", "niveau"],
                "keywords_fr": ["architecture", "plan niveau", "distribution"]
            },
            {
                "id": "btp_032",
                "name": "Plan de récolement",
                "category": "Plans",
                "format": ["PDF", "DWG"],
                "avg_pages": 15,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["modification", "réalisation", "conforme"],
                "keywords_fr": ["récolement", "conforme exécution", "dossier ouvrages exécutés"]
            },
            {
                "id": "btp_033",
                "name": "Plan VRD (Voirie et Réseaux Divers)",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["réseau", "canalisation", "branchement"],
                "keywords_fr": ["vrd", "réseaux", "voirie"]
            },
            {
                "id": "btp_034",
                "name": "Plan topographique",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["cote altimétrique", "courbe niveau", "point"],
                "keywords_fr": ["topographie", "nivellement", "courbe niveau"]
            },
            {
                "id": "btp_035",
                "name": "Plan de fondation",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 4,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["semelle", "pieu", "longueur", "profondeur"],
                "keywords_fr": ["fondation", "semelle", "infrastructure"]
            },
            {
                "id": "btp_036",
                "name": "Plan de charpente",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 6,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["ferme", "panne", "section", "assemblage"],
                "keywords_fr": ["charpente", "bois", "métallique"]
            },
            {
                "id": "btp_037",
                "name": "Plan de façade",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["élévation", "matériau", "finition"],
                "keywords_fr": ["façade", "élévation", "parement"]
            },
            {
                "id": "btp_038",
                "name": "Plan de couverture",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["pente", "tuile", "évacuation"],
                "keywords_fr": ["couverture", "toiture", "étanchéité"]
            },
            {
                "id": "btp_039",
                "name": "Plan électrique",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 6,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["tableau", "circuit", "prise", "éclairage"],
                "keywords_fr": ["électricité", "courant", "installation électrique"]
            },
            {
                "id": "btp_040",
                "name": "Plan de plomberie",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["réseau eau", "évacuation", "diamètre"],
                "keywords_fr": ["plomberie", "sanitaire", "réseau eau"]
            },
            {
                "id": "btp_041",
                "name": "Plan CVC (Chauffage Ventilation Climatisation)",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 8,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["gaine", "bouche", "centrale", "débit"],
                "keywords_fr": ["cvc", "ventilation", "climatisation"]
            },
            {
                "id": "btp_042",
                "name": "Plan de sécurité incendie",
                "category": "Plans",
                "format": ["PDF", "DWG"],
                "avg_pages": 4,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["issue secours", "extincteur", "alarme"],
                "keywords_fr": ["sécurité incendie", "évacuation", "erp"]
            },
            {
                "id": "btp_043",
                "name": "Plan d'aménagement paysager",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["végétal", "plantation", "espace vert"],
                "keywords_fr": ["paysager", "espaces verts", "plantation"]
            },
            {
                "id": "btp_044",
                "name": "Coupe transversale",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["section", "niveau", "hauteur"],
                "keywords_fr": ["coupe", "section", "transversale"]
            },
            {
                "id": "btp_045",
                "name": "Coupe longitudinale",
                "category": "Plans",
                "format": ["DWG", "PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["section", "profil", "pente"],
                "keywords_fr": ["coupe longitudinale", "profil", "axe"]
            },

            # Études et Rapports Techniques (20 types)
            {
                "id": "btp_046",
                "name": "Étude de sol G2",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 30,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["sondage", "portance", "tassement", "nappe"],
                "keywords_fr": ["étude sol", "géotechnique", "g2"]
            },
            {
                "id": "btp_047",
                "name": "Diagnostic amiante",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 20,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["matériau", "prélèvement", "amiante", "zone"],
                "keywords_fr": ["amiante", "diagnostic", "avant travaux"]
            },
            {
                "id": "btp_048",
                "name": "Diagnostic plomb (CREP)",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 15,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["revêtement", "concentration", "local"],
                "keywords_fr": ["plomb", "crep", "peinture"]
            },
            {
                "id": "btp_049",
                "name": "DPE (Diagnostic de Performance Énergétique)",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 10,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["consommation", "ges", "classe énergétique"],
                "keywords_fr": ["dpe", "performance énergétique", "classe énergie"]
            },
            {
                "id": "btp_050",
                "name": "Étude thermique RT2012/RE2020",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 40,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["bbio", "cep", "tic", "isolation"],
                "keywords_fr": ["rt2012", "re2020", "réglementation thermique"]
            },
            {
                "id": "btp_051",
                "name": "Note de calcul structure",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 50,
                "pipeline": "quantitative",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["charge", "moment", "contrainte", "eurocodes"],
                "keywords_fr": ["calcul structure", "dimensionnement", "béton armé"]
            },
            {
                "id": "btp_052",
                "name": "Étude acoustique",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 25,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["db", "isolation phonique", "bruit"],
                "keywords_fr": ["acoustique", "phonique", "bruit"]
            },
            {
                "id": "btp_053",
                "name": "Rapport de sondage destructif",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 12,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["carotte", "résistance", "essai"],
                "keywords_fr": ["sondage", "carotte béton", "essai destructif"]
            },
            {
                "id": "btp_054",
                "name": "Diagnostic technique global (DTG)",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 60,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["copropriété", "état", "travaux"],
                "keywords_fr": ["dtg", "copropriété", "état général"]
            },
            {
                "id": "btp_055",
                "name": "Étude d'impact environnemental",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 100,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["impact", "environnement", "mesure compensatoire"],
                "keywords_fr": ["impact environnemental", "biodiversité", "compensation"]
            },
            {
                "id": "btp_056",
                "name": "Rapport d'essai béton",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 8,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["résistance", "mpa", "échantillon"],
                "keywords_fr": ["essai béton", "compression", "résistance"]
            },
            {
                "id": "btp_057",
                "name": "Étude de faisabilité",
                "category": "Études techniques",
                "format": ["PDF", "DOCX"],
                "avg_pages": 35,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["scénario", "coût", "délai", "contrainte"],
                "keywords_fr": ["faisabilité", "avant-projet", "étude préalable"]
            },
            {
                "id": "btp_058",
                "name": "Rapport géotechnique G1",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 20,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["reconnaissance", "sondage", "terrain"],
                "keywords_fr": ["géotechnique", "g1", "reconnaissance"]
            },
            {
                "id": "btp_059",
                "name": "Notice de sécurité et accessibilité",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 30,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["erp", "accessibilité pmr", "issue"],
                "keywords_fr": ["sécurité", "accessibilité", "erp"]
            },
            {
                "id": "btp_060",
                "name": "Diagnostic termites",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 10,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["infestation", "bois", "zone"],
                "keywords_fr": ["termites", "parasites", "insectes xylophages"]
            },
            {
                "id": "btp_061",
                "name": "Diagnostic électricité",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 12,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["anomalie", "norme", "tableau"],
                "keywords_fr": ["diagnostic électrique", "installation", "norme"]
            },
            {
                "id": "btp_062",
                "name": "Diagnostic gaz",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 8,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["installation gaz", "anomalie", "danger"],
                "keywords_fr": ["diagnostic gaz", "installation", "danger"]
            },
            {
                "id": "btp_063",
                "name": "État des risques naturels (ERNMT)",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["risque", "zone", "arrêté"],
                "keywords_fr": ["ernmt", "risques naturels", "inondation"]
            },
            {
                "id": "btp_064",
                "name": "Audit énergétique",
                "category": "Études techniques",
                "format": ["PDF"],
                "avg_pages": 45,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["consommation", "préconisation", "économie"],
                "keywords_fr": ["audit énergétique", "rénovation", "économies"]
            },
            {
                "id": "btp_065",
                "name": "Métré quantitatif",
                "category": "Études techniques",
                "format": ["XLSX", "PDF"],
                "avg_pages": 35,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["quantité", "surface", "volume", "unité"],
                "keywords_fr": ["métré", "quantitatif", "métreur"]
            },

            # Suivi de chantier (15 types)
            {
                "id": "btp_066",
                "name": "Compte-rendu de chantier",
                "category": "Suivi chantier",
                "format": ["PDF", "DOCX"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["avancement", "problème", "décision", "présent"],
                "keywords_fr": ["compte-rendu", "réunion chantier", "cr"]
            },
            {
                "id": "btp_067",
                "name": "Planning de travaux (Gantt)",
                "category": "Suivi chantier",
                "format": ["PDF", "MPP", "XLSX"],
                "avg_pages": 10,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["tâche", "durée", "jalon", "chemin critique"],
                "keywords_fr": ["planning", "gantt", "ordonnancement"]
            },
            {
                "id": "btp_068",
                "name": "Ordre de service (OS)",
                "category": "Suivi chantier",
                "format": ["PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["ordre", "date", "objet"],
                "keywords_fr": ["ordre service", "os", "démarrage"]
            },
            {
                "id": "btp_069",
                "name": "Procès-verbal de réception",
                "category": "Suivi chantier",
                "format": ["PDF"],
                "avg_pages": 8,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["réserve", "réception", "livraison"],
                "keywords_fr": ["pv réception", "livraison", "réserves"]
            },
            {
                "id": "btp_070",
                "name": "Attachement de travaux",
                "category": "Suivi chantier",
                "format": ["PDF", "XLSX"],
                "avg_pages": 15,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["quantité réalisée", "poste", "visa"],
                "keywords_fr": ["attachement", "constatation", "quantité"]
            },
            {
                "id": "btp_071",
                "name": "Situation de travaux",
                "category": "Suivi chantier",
                "format": ["PDF", "XLSX"],
                "avg_pages": 12,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["avancement", "paiement", "montant"],
                "keywords_fr": ["situation", "décompte", "paiement"]
            },
            {
                "id": "btp_072",
                "name": "Rapport journalier de chantier",
                "category": "Suivi chantier",
                "format": ["PDF", "DOCX"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["effectif", "météo", "activité", "matériel"],
                "keywords_fr": ["rapport journalier", "main d'oeuvre", "activité"]
            },
            {
                "id": "btp_073",
                "name": "Demande d'agrément",
                "category": "Suivi chantier",
                "format": ["PDF", "DOCX"],
                "avg_pages": 10,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["matériau", "fiche technique", "validation"],
                "keywords_fr": ["agrément", "validation", "matériau"]
            },
            {
                "id": "btp_074",
                "name": "Fiche de non-conformité",
                "category": "Suivi chantier",
                "format": ["PDF"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["anomalie", "action corrective", "responsable"],
                "keywords_fr": ["non-conformité", "anomalie", "qualité"]
            },
            {
                "id": "btp_075",
                "name": "Levée de réserve",
                "category": "Suivi chantier",
                "format": ["PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["réserve", "levée", "date"],
                "keywords_fr": ["levée réserve", "clôture", "réception"]
            },
            {
                "id": "btp_076",
                "name": "Demande de travaux supplémentaires",
                "category": "Suivi chantier",
                "format": ["PDF", "DOCX"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["supplément", "justification", "prix"],
                "keywords_fr": ["travaux supplémentaires", "plus-value", "avenant"]
            },
            {
                "id": "btp_077",
                "name": "Bon de livraison",
                "category": "Suivi chantier",
                "format": ["PDF"],
                "avg_pages": 1,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["matériau", "quantité", "réception"],
                "keywords_fr": ["bon livraison", "réception matériaux", "bl"]
            },
            {
                "id": "btp_078",
                "name": "Constat d'huissier",
                "category": "Suivi chantier",
                "format": ["PDF"],
                "avg_pages": 8,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["constatation", "état", "date"],
                "keywords_fr": ["huissier", "constat", "état lieux"]
            },
            {
                "id": "btp_079",
                "name": "Décompte général et définitif (DGD)",
                "category": "Suivi chantier",
                "format": ["PDF", "XLSX"],
                "avg_pages": 25,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["montant final", "révision", "solde"],
                "keywords_fr": ["dgd", "décompte final", "solde"]
            },
            {
                "id": "btp_080",
                "name": "Mémoire en réclamation",
                "category": "Suivi chantier",
                "format": ["PDF", "DOCX"],
                "avg_pages": 15,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["réclamation", "préjudice", "demande"],
                "keywords_fr": ["réclamation", "mémoire", "litige"]
            },

            # Normes et Réglementations (15 types)
            {
                "id": "btp_081",
                "name": "DTU (Document Technique Unifié)",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 120,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["règle art", "mise en oeuvre", "matériau"],
                "keywords_fr": ["dtu", "norme", "règles art"]
            },
            {
                "id": "btp_082",
                "name": "Norme NF",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 80,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["exigence", "essai", "spécification"],
                "keywords_fr": ["norme nf", "afnor", "certification"]
            },
            {
                "id": "btp_083",
                "name": "Eurocode",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 200,
                "pipeline": "quantitative",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["calcul", "résistance", "coefficient"],
                "keywords_fr": ["eurocode", "calcul structure", "en 1992"]
            },
            {
                "id": "btp_084",
                "name": "Avis technique (ATec)",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 40,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["produit", "domaine emploi", "mise en oeuvre"],
                "keywords_fr": ["avis technique", "atec", "cstb"]
            },
            {
                "id": "btp_085",
                "name": "Fiche de Déclaration Environnementale et Sanitaire (FDES)",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 12,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["acv", "impact", "produit"],
                "keywords_fr": ["fdes", "environnementale", "acv"]
            },
            {
                "id": "btp_086",
                "name": "Certificat de conformité CE",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["conformité", "marquage ce", "norme"],
                "keywords_fr": ["ce", "conformité", "marquage"]
            },
            {
                "id": "btp_087",
                "name": "Procès-verbal d'essai laboratoire",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 8,
                "pipeline": "quantitative",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["essai", "résultat", "norme"],
                "keywords_fr": ["pv essai", "laboratoire", "résultat"]
            },
            {
                "id": "btp_088",
                "name": "Fiche technique produit",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 6,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["caractéristique", "application", "dosage"],
                "keywords_fr": ["fiche technique", "produit", "caractéristiques"]
            },
            {
                "id": "btp_089",
                "name": "Fiche de données de sécurité (FDS)",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 15,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["danger", "précaution", "composition"],
                "keywords_fr": ["fds", "sécurité", "produit chimique"]
            },
            {
                "id": "btp_090",
                "name": "Agrément européen (ETA)",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 30,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": False,
                "typical_entities": ["évaluation technique", "produit", "performance"],
                "keywords_fr": ["eta", "agrément", "évaluation technique"]
            },
            {
                "id": "btp_091",
                "name": "Cahier des prescriptions communes (CPC)",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 60,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["prescription", "travaux", "spécification"],
                "keywords_fr": ["cpc", "prescriptions communes", "fascicule"]
            },
            {
                "id": "btp_092",
                "name": "Guide technique professionnel",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 100,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["recommandation", "pratique", "méthode"],
                "keywords_fr": ["guide", "professionnel", "recommandation"]
            },
            {
                "id": "btp_093",
                "name": "Règlement sanitaire départemental",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 150,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["règle", "hygiène", "salubrité"],
                "keywords_fr": ["rsd", "sanitaire", "hygiène"]
            },
            {
                "id": "btp_094",
                "name": "Code de la construction et de l'habitation",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 500,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["article", "loi", "règle"],
                "keywords_fr": ["cch", "code construction", "loi"]
            },
            {
                "id": "btp_095",
                "name": "Plan Local d'Urbanisme (PLU)",
                "category": "Normes",
                "format": ["PDF"],
                "avg_pages": 200,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["zone", "règle urbanisme", "coefficient"],
                "keywords_fr": ["plu", "urbanisme", "zone constructible"]
            },

            # Autorisations et Administratif (30 types)
            {
                "id": "btp_096",
                "name": "Permis de construire (PC)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 50,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["autorisation", "parcelle", "surface"],
                "keywords_fr": ["permis construire", "pc", "cerfa"]
            },
            {
                "id": "btp_097",
                "name": "Déclaration préalable de travaux (DP)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 20,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["déclaration", "travaux", "modification"],
                "keywords_fr": ["déclaration préalable", "dp", "cerfa"]
            },
            {
                "id": "btp_098",
                "name": "Permis d'aménager",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 40,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["lotissement", "aménagement", "terrain"],
                "keywords_fr": ["permis aménager", "lotissement", "division"]
            },
            {
                "id": "btp_099",
                "name": "Permis de démolir",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 15,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["démolition", "bâtiment", "autorisation"],
                "keywords_fr": ["permis démolir", "démolition", "destruction"]
            },
            {
                "id": "btp_100",
                "name": "Attestation de conformité",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["conformité", "achèvement", "règle"],
                "keywords_fr": ["attestation conformité", "achèvement", "daact"]
            },
            {
                "id": "btp_101",
                "name": "DICT (Déclaration d'Intention de Commencement de Travaux)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["réseau", "concessionnaire", "réponse"],
                "keywords_fr": ["dict", "réseaux", "concessionnaire"]
            },
            {
                "id": "btp_102",
                "name": "Arrêté de circulation",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["voirie", "déviation", "période"],
                "keywords_fr": ["arrêté circulation", "voirie", "permission voirie"]
            },
            {
                "id": "btp_103",
                "name": "Certificat d'urbanisme (CU)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 8,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["renseignement", "règle", "servitude"],
                "keywords_fr": ["certificat urbanisme", "cu", "information"]
            },
            {
                "id": "btp_104",
                "name": "Déclaration d'ouverture de chantier (DOC)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["ouverture", "date", "maître ouvrage"],
                "keywords_fr": ["doc", "ouverture chantier", "cerfa"]
            },
            {
                "id": "btp_105",
                "name": "Déclaration d'achèvement (DAACT)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["achèvement", "conformité", "date"],
                "keywords_fr": ["daact", "achèvement", "déclaration"]
            },
            {
                "id": "btp_106",
                "name": "Arrêté préfectoral",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 10,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["autorisation", "préfet", "condition"],
                "keywords_fr": ["arrêté préfectoral", "préfecture", "autorisation"]
            },
            {
                "id": "btp_107",
                "name": "Récépissé de dépôt",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 1,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["dépôt", "numéro", "date"],
                "keywords_fr": ["récépissé", "dépôt", "enregistrement"]
            },
            {
                "id": "btp_108",
                "name": "Certificat de conformité ERP",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["erp", "catégorie", "commission sécurité"],
                "keywords_fr": ["erp", "établissement recevant public", "sécurité"]
            },
            {
                "id": "btp_109",
                "name": "Autorisation de voirie",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 4,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["occupation", "voie publique", "redevance"],
                "keywords_fr": ["autorisation voirie", "occupation", "domaine public"]
            },
            {
                "id": "btp_110",
                "name": "Contrat de maîtrise d'oeuvre (MOE)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 30,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["mission", "honoraire", "architecte"],
                "keywords_fr": ["maîtrise oeuvre", "moe", "architecte"]
            },
            {
                "id": "btp_111",
                "name": "Contrat de maîtrise d'ouvrage déléguée (MOD)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 25,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["délégation", "mission", "rémunération"],
                "keywords_fr": ["mod", "maîtrise ouvrage", "délégation"]
            },
            {
                "id": "btp_112",
                "name": "Contrat de location de matériel",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 8,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["matériel", "location", "tarif"],
                "keywords_fr": ["location", "matériel", "engin"]
            },
            {
                "id": "btp_113",
                "name": "Contrat de sous-traitance",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 20,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["sous-traitant", "prestation", "paiement"],
                "keywords_fr": ["sous-traitance", "contrat", "agrément"]
            },
            {
                "id": "btp_114",
                "name": "Déclaration de sous-traitance",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["sous-traitant", "montant", "acceptation"],
                "keywords_fr": ["sous-traitance", "déclaration", "agrément"]
            },
            {
                "id": "btp_115",
                "name": "Police d'assurance tous risques chantier (TRC)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 40,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["garantie", "franchise", "sinistre"],
                "keywords_fr": ["trc", "assurance chantier", "tous risques"]
            },
            {
                "id": "btp_116",
                "name": "Caution de garantie financière",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 5,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["caution", "montant", "garantie"],
                "keywords_fr": ["caution", "garantie", "banque"]
            },
            {
                "id": "btp_117",
                "name": "Kbis entreprise",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 2,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["immatriculation", "siret", "activité"],
                "keywords_fr": ["kbis", "extrait", "immatriculation"]
            },
            {
                "id": "btp_118",
                "name": "Copie carte BTP",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 1,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 3,
                "french_only": True,
                "typical_entities": ["identification", "salarié", "profession"],
                "keywords_fr": ["carte btp", "identification", "pro btp"]
            },
            {
                "id": "btp_119",
                "name": "Garantie de parfait achèvement",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 3,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["garantie", "année", "réserve"],
                "keywords_fr": ["parfait achèvement", "garantie", "gpa"]
            },
            {
                "id": "btp_120",
                "name": "Garantie biennale",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 4,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["équipement", "deux ans", "garantie"],
                "keywords_fr": ["biennale", "garantie", "équipement"]
            },
            {
                "id": "btp_121",
                "name": "Document Unique d'Évaluation des Risques (DUER)",
                "category": "Autorisations",
                "format": ["PDF", "XLSX"],
                "avg_pages": 30,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["risque", "évaluation", "prévention"],
                "keywords_fr": ["duer", "risques professionnels", "sécurité"]
            },
            {
                "id": "btp_122",
                "name": "Plan de prévention",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 20,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["coactivité", "risque", "mesure"],
                "keywords_fr": ["plan prévention", "coactivité", "inspection travail"]
            },
            {
                "id": "btp_123",
                "name": "PGC (Plan Général de Coordination)",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 50,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["coordination", "phase", "mesure"],
                "keywords_fr": ["pgc", "coordination sps", "sécurité"]
            },
            {
                "id": "btp_124",
                "name": "Registre journal de coordination SPS",
                "category": "Autorisations",
                "format": ["PDF"],
                "avg_pages": 50,
                "pipeline": "standard",
                "chunking_strategy": "default_semantic",
                "priority": 2,
                "french_only": True,
                "typical_entities": ["visite", "observation", "entreprise"],
                "keywords_fr": ["registre", "coordination", "csps"]
            },
            {
                "id": "btp_125",
                "name": "DOE (Dossier des Ouvrages Exécutés)",
                "category": "Autorisations",
                "format": ["PDF", "ZIP"],
                "avg_pages": 200,
                "pipeline": "standard",
                "chunking_strategy": "btp_spec_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["plan", "notice", "pv"],
                "keywords_fr": ["doe", "ouvrages exécutés", "dossier technique"]
            },
        ]
    },

    "Finance": {
        "types": [
            # ... (Les 125 types Finance seraient listés ici avec la même structure)
            # Pour l'instant, je vais inclure quelques exemples représentatifs:
            {
                "id": "fin_001",
                "name": "Bilan comptable annuel",
                "category": "Comptabilité",
                "format": ["PDF", "XLSX"],
                "avg_pages": 15,
                "pipeline": "quantitative",
                "chunking_strategy": "finance_page_level",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["actif", "passif", "total", "exercice"],
                "keywords_fr": ["bilan", "actif", "passif", "capitaux propres"]
            },
            {
                "id": "fin_002",
                "name": "Compte de résultat",
                "category": "Comptabilité",
                "format": ["PDF", "XLSX"],
                "avg_pages": 10,
                "pipeline": "quantitative",
                "chunking_strategy": "finance_page_level",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["produit", "charge", "résultat", "exercice"],
                "keywords_fr": ["compte résultat", "produits", "charges", "bénéfice"]
            },
            {
                "id": "fin_003",
                "name": "Annexe comptable",
                "category": "Comptabilité",
                "format": ["PDF"],
                "avg_pages": 25,
                "pipeline": "standard",
                "chunking_strategy": "finance_page_level",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["méthode", "événement", "engagement"],
                "keywords_fr": ["annexe", "principes comptables", "informations complémentaires"]
            },
            # ... 122 more Finance types would go here
        ]
    },

    "Juridique": {
        "types": [
            # Similar structure for 125 legal document types
            {
                "id": "jur_001",
                "name": "Contrat de travail CDI",
                "category": "Droit du travail",
                "format": ["PDF", "DOCX"],
                "avg_pages": 8,
                "pipeline": "standard",
                "chunking_strategy": "legal_clause_based",
                "priority": 1,
                "french_only": True,
                "typical_entities": ["employeur", "salarié", "rémunération", "durée"],
                "keywords_fr": ["contrat travail", "cdi", "salarié", "rémunération"]
            },
            # ... 124 more Juridique types
        ]
    },

    "Industrie": {
        "types": [
            # Similar structure for 125 industrial document types
            {
                "id": "ind_001",
                "name": "Fiche technique produit manufacturé",
                "category": "Production",
                "format": ["PDF"],
                "avg_pages": 12,
                "pipeline": "standard",
                "chunking_strategy": "industry_hierarchical",
                "priority": 1,
                "french_only": False,
                "typical_entities": ["référence", "dimension", "matériau", "tolérance"],
                "keywords_fr": ["fiche technique", "spécification", "référence"]
            },
            # ... 124 more Industrie types
        ]
    }
}


def get_types_by_sector(sector: str) -> List[Dict[str, Any]]:
    """Get all document types for a specific sector."""
    if sector not in SECTOR_FILE_TYPES:
        return []
    return SECTOR_FILE_TYPES[sector]["types"]


def get_types_by_pipeline(pipeline: str) -> List[Dict[str, Any]]:
    """Get all document types handled by a specific RAG pipeline."""
    results = []
    for sector_data in SECTOR_FILE_TYPES.values():
        for doc_type in sector_data["types"]:
            if doc_type["pipeline"] == pipeline:
                results.append(doc_type)
    return results


def detect_sector(filename: str, content_preview: Optional[str] = None) -> Optional[str]:
    """
    Detect sector from filename and optional content preview.
    Returns sector name or None if unable to detect.
    """
    filename_lower = filename.lower()

    # BTP keywords
    btp_keywords = ["chantier", "btp", "cctp", "ccap", "dpgf", "marché", "construction",
                    "plan", "architecte", "béton", "fondation", "terrassement"]

    # Finance keywords
    finance_keywords = ["bilan", "comptable", "fiscal", "finance", "budget", "trésorerie",
                       "compte", "résultat", "annexe", "liasse"]

    # Juridique keywords
    juridique_keywords = ["contrat", "juridique", "bail", "acte", "procès", "jugement",
                         "convention", "cession", "statut", "règlement"]

    # Industrie keywords
    industrie_keywords = ["industrie", "production", "manufacturing", "technique", "process",
                         "gamme", "nomenclature", "amdec", "iso"]

    # Check filename
    if any(kw in filename_lower for kw in btp_keywords):
        return "BTP"
    if any(kw in filename_lower for kw in finance_keywords):
        return "Finance"
    if any(kw in filename_lower for kw in juridique_keywords):
        return "Juridique"
    if any(kw in filename_lower for kw in industrie_keywords):
        return "Industrie"

    # Check content if provided
    if content_preview:
        content_lower = content_preview.lower()

        # Count keyword matches
        scores = {
            "BTP": sum(1 for kw in btp_keywords if kw in content_lower),
            "Finance": sum(1 for kw in finance_keywords if kw in content_lower),
            "Juridique": sum(1 for kw in juridique_keywords if kw in content_lower),
            "Industrie": sum(1 for kw in industrie_keywords if kw in content_lower)
        }

        # Return sector with highest score (if > 0)
        max_sector = max(scores.items(), key=lambda x: x[1])
        if max_sector[1] > 0:
            return max_sector[0]

    return None


def get_chunking_strategy(sector: str, doc_type_id: Optional[str] = None) -> str:
    """
    Get the appropriate chunking strategy for a sector/document type.
    Returns strategy name.
    """
    if doc_type_id:
        # Find specific type
        for sector_data in SECTOR_FILE_TYPES.values():
            for dtype in sector_data["types"]:
                if dtype["id"] == doc_type_id:
                    return dtype["chunking_strategy"]

    # Default by sector
    defaults = {
        "Finance": "finance_page_level",
        "Juridique": "legal_clause_based",
        "BTP": "btp_spec_based",
        "Industrie": "industry_hierarchical"
    }

    return defaults.get(sector, "default_semantic")


def get_pipeline_for_type(type_id: str) -> Optional[str]:
    """Get the RAG pipeline that should handle this document type."""
    for sector_data in SECTOR_FILE_TYPES.values():
        for dtype in sector_data["types"]:
            if dtype["id"] == type_id:
                return dtype["pipeline"]
    return None


def get_total_types() -> int:
    """Get total number of document types across all sectors."""
    total = 0
    for sector_data in SECTOR_FILE_TYPES.values():
        total += len(sector_data["types"])
    return total


def get_priority_types(max_priority: int = 1) -> List[Dict[str, Any]]:
    """Get all document types with priority <= max_priority."""
    results = []
    for sector_data in SECTOR_FILE_TYPES.values():
        for dtype in sector_data["types"]:
            if dtype["priority"] <= max_priority:
                results.append(dtype)
    return results


def get_stats() -> Dict[str, Any]:
    """Get statistics about document types."""
    stats = {
        "total_types": get_total_types(),
        "by_sector": {},
        "by_pipeline": {},
        "by_priority": {},
        "by_chunking_strategy": {}
    }

    for sector, sector_data in SECTOR_FILE_TYPES.items():
        stats["by_sector"][sector] = len(sector_data["types"])

    for sector_data in SECTOR_FILE_TYPES.values():
        for dtype in sector_data["types"]:
            # Count by pipeline
            pipeline = dtype["pipeline"]
            stats["by_pipeline"][pipeline] = stats["by_pipeline"].get(pipeline, 0) + 1

            # Count by priority
            priority = dtype["priority"]
            stats["by_priority"][priority] = stats["by_priority"].get(priority, 0) + 1

            # Count by chunking strategy
            strategy = dtype["chunking_strategy"]
            stats["by_chunking_strategy"][strategy] = stats["by_chunking_strategy"].get(strategy, 0) + 1

    return stats


if __name__ == "__main__":
    # Print stats
    print("=== Sector File Types Statistics ===\n")
    stats = get_stats()

    print(f"Total document types: {stats['total_types']}\n")

    print("By sector:")
    for sector, count in stats["by_sector"].items():
        print(f"  {sector}: {count}")

    print("\nBy pipeline:")
    for pipeline, count in stats["by_pipeline"].items():
        print(f"  {pipeline}: {count}")

    print("\nBy priority:")
    for priority, count in sorted(stats["by_priority"].items()):
        print(f"  P{priority}: {count}")

    print("\nBy chunking strategy:")
    for strategy, count in stats["by_chunking_strategy"].items():
        print(f"  {strategy}: {count}")

    # Test detection
    print("\n=== Detection Tests ===")
    test_files = [
        "CCTP_projet_construction.pdf",
        "bilan_2025.xlsx",
        "contrat_travail_CDI.pdf",
        "fiche_technique_produit.pdf"
    ]

    for filename in test_files:
        sector = detect_sector(filename)
        print(f"{filename} → {sector}")
