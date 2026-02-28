# Requirements Document

## Introduction

Ce document spécifie les exigences pour le frontend kiosque patient de Triastral — une interface web voice-first qui permet aux patients de réaliser leur pré-triage aux urgences via une conversation vocale avec un agent IA. Le frontend se connecte au backend Triastral (BidiAgent Nova Sonic 2) via une couche API FastAPI + WebSocket, et guide le patient à travers un flux en 4 phases : accueil → conversation vocale → validation → ticket de file d'attente.

## Glossary

- **Kiosk_Frontend**: L'application web React (Next.js) affichée sur la borne patient aux urgences
- **API_Layer**: Le serveur FastAPI avec endpoint WebSocket qui fait le pont entre le frontend et le BidiAgent backend
- **WebSocket_Connection**: La connexion bidirectionnelle temps réel entre le Kiosk_Frontend et l'API_Layer pour le streaming audio et les événements
- **Audio_Capture_Service**: Le service navigateur qui capture l'audio du microphone en PCM 16kHz mono et l'envoie via WebSocket
- **Audio_Playback_Service**: Le service navigateur qui reçoit l'audio PCM 24kHz du backend et le joue via l'AudioContext Web API
- **Kiosk_Phase**: L'une des 4 phases du parcours patient : welcome, conversation, validation, ticket
- **State_Machine**: Le hook React qui gère les transitions entre les Kiosk_Phases et l'état de la conversation
- **Avatar**: Le personnage pixel art animé qui représente visuellement l'agent vocal pour le patient
- **Speech_Bubble**: Le composant d'affichage des messages textuels de l'agent et du patient
- **Triage_Document**: Le document JSON structuré généré par le backend contenant l'évaluation clinique et la recommandation CCMU
- **QR_Ticket**: Le ticket de file d'attente avec QR code généré en fin de parcours pour le suivi patient
- **Information_Boundary**: La règle de sécurité qui interdit l'affichage des niveaux CCMU, red flags et évaluations cliniques au patient
- **Barge_In**: La capacité du patient à interrompre la parole de l'agent en commençant à parler

## Requirements

### Requirement 1: Couche API FastAPI + WebSocket

**User Story:** En tant que développeur, je veux une couche API FastAPI avec un endpoint WebSocket, afin que le frontend puisse communiquer en temps réel avec le BidiAgent backend pour le streaming audio bidirectionnel.

#### Acceptance Criteria

1. THE API_Layer SHALL expose un endpoint WebSocket à `/ws` qui accepte les connexions du Kiosk_Frontend
2. WHEN le Kiosk_Frontend établit une connexion WebSocket, THE API_Layer SHALL initialiser une session BidiAgent avec le modèle Nova Sonic 2 et les outils clinical_assessment, query_health_data et stop_conversation
3. WHEN le Kiosk_Frontend envoie des données audio PCM 16kHz via WebSocket, THE API_Layer SHALL transmettre ces données au BidiAgent en entrée audio
4. WHEN le BidiAgent produit une sortie audio, THE API_Layer SHALL transmettre les données audio PCM 24kHz au Kiosk_Frontend via WebSocket encodées en base64
5. WHEN le BidiAgent exécute un outil (clinical_assessment ou query_health_data), THE API_Layer SHALL envoyer un événement JSON `toolUse` au Kiosk_Frontend contenant le nom de l'outil et le statut d'exécution
6. WHEN le BidiAgent produit du texte (transcription), THE API_Layer SHALL envoyer un événement JSON `textOutput` au Kiosk_Frontend contenant le rôle (agent ou user) et le contenu textuel
7. WHEN le BidiAgent appelle stop_conversation, THE API_Layer SHALL envoyer un événement JSON `sessionEnd` au Kiosk_Frontend contenant le Triage_Document compilé
8. IF la connexion WebSocket est interrompue, THEN THE API_Layer SHALL libérer les ressources de la session BidiAgent associée
9. THE API_Layer SHALL exposer un endpoint GET `/health` qui retourne le statut du serveur

### Requirement 2: Flux kiosque en 4 phases

**User Story:** En tant que patient aux urgences, je veux être guidé à travers un parcours clair en 4 étapes (accueil, conversation, validation, ticket), afin de comprendre facilement où j'en suis dans le processus de pré-triage.

#### Acceptance Criteria

1. THE State_Machine SHALL gérer exactement 4 phases séquentielles : `welcome`, `conversation`, `validation`, `ticket`
2. WHEN le patient appuie sur le bouton "Commencer" dans la phase `welcome`, THE State_Machine SHALL transitionner vers la phase `conversation`
3. WHEN le BidiAgent envoie l'événement `sessionEnd`, THE State_Machine SHALL transitionner de la phase `conversation` vers la phase `validation`
4. WHEN le patient confirme ses informations dans la phase `validation`, THE State_Machine SHALL transitionner vers la phase `ticket`
5. WHEN le patient appuie sur "Recommencer" dans la phase `ticket`, THE State_Machine SHALL réinitialiser l'état et transitionner vers la phase `welcome`
6. THE Kiosk_Frontend SHALL afficher un indicateur visuel de progression montrant la phase courante parmi les 4 phases

### Requirement 3: Capture et envoi audio depuis le navigateur

**User Story:** En tant que patient, je veux parler dans le microphone de la borne et que ma voix soit transmise à l'agent IA, afin de pouvoir décrire mes symptômes oralement.

#### Acceptance Criteria

1. WHEN la phase `conversation` commence, THE Audio_Capture_Service SHALL demander l'accès au microphone du navigateur
2. THE Audio_Capture_Service SHALL capturer l'audio en PCM 16 bits mono à un taux d'échantillonnage de 16000 Hz
3. WHILE la phase `conversation` est active, THE Audio_Capture_Service SHALL envoyer les données audio capturées au WebSocket_Connection par blocs de 3200 échantillons (200ms)
4. WHEN la phase `conversation` se termine, THE Audio_Capture_Service SHALL arrêter la capture et libérer le flux microphone
5. IF le navigateur refuse l'accès au microphone, THEN THE Kiosk_Frontend SHALL afficher un message d'erreur en français expliquant que le microphone est requis

### Requirement 4: Réception et lecture audio de l'agent

**User Story:** En tant que patient, je veux entendre la voix de l'agent IA à travers les haut-parleurs de la borne, afin de comprendre les questions qui me sont posées.

#### Acceptance Criteria

1. WHEN le WebSocket_Connection reçoit des données audio base64 du backend, THE Audio_Playback_Service SHALL décoder les données PCM 24kHz et les jouer via l'AudioContext Web API
2. THE Audio_Playback_Service SHALL enchaîner les blocs audio reçus sans interruption audible en utilisant un scheduling basé sur le temps
3. WHEN le patient commence à parler pendant que l'agent parle (Barge_In), THE Audio_Playback_Service SHALL arrêter immédiatement la lecture audio en cours
4. WHEN la phase `conversation` se termine, THE Audio_Playback_Service SHALL arrêter toute lecture audio en cours et libérer les ressources AudioContext

### Requirement 5: Interface de conversation vocale

**User Story:** En tant que patient, je veux voir un avatar animé et des bulles de dialogue pendant la conversation, afin de me sentir accompagné et de suivre visuellement l'échange.

#### Acceptance Criteria

1. WHILE la phase `conversation` est active, THE Kiosk_Frontend SHALL afficher l'Avatar pixel art au centre de l'écran
2. WHEN l'agent parle, THE Avatar SHALL passer à l'état d'animation `talking`
3. WHEN le patient parle, THE Avatar SHALL passer à l'état d'animation `listening`
4. WHILE aucun audio n'est échangé, THE Avatar SHALL afficher l'état d'animation `idle`
5. WHEN l'agent produit du texte, THE Kiosk_Frontend SHALL afficher le message dans une Speech_Bubble avec un effet de typewriter
6. WHEN le patient parle et que la transcription est reçue, THE Kiosk_Frontend SHALL afficher le message du patient dans une Speech_Bubble distincte
7. WHILE un outil backend est en cours d'exécution, THE Kiosk_Frontend SHALL afficher un indicateur visuel de traitement (animation de réflexion sur l'Avatar)

### Requirement 6: Écran d'accueil

**User Story:** En tant que patient arrivant à la borne, je veux voir un écran d'accueil clair en français avec des instructions simples, afin de comprendre comment démarrer le processus.

#### Acceptance Criteria

1. THE Kiosk_Frontend SHALL afficher l'écran d'accueil en français avec le nom "Triastral" et une description du service
2. THE Kiosk_Frontend SHALL afficher un bouton "Commencer" visible et accessible pour démarrer la conversation
3. THE Avatar SHALL afficher l'état d'animation `waving` sur l'écran d'accueil
4. THE Kiosk_Frontend SHALL afficher un message de consentement informant le patient que la conversation sera analysée par une IA à des fins de pré-triage

### Requirement 7: Écran de validation

**User Story:** En tant que patient, je veux voir un résumé factuel de ce que j'ai dit à l'agent avant de confirmer, afin de vérifier que mes informations ont été correctement comprises.

#### Acceptance Criteria

1. WHEN la phase `validation` est active, THE Kiosk_Frontend SHALL afficher un résumé factuel des informations collectées (motif de consultation, symptômes déclarés, antécédents, médicaments, allergies)
2. THE Kiosk_Frontend SHALL respecter l'Information_Boundary en excluant les niveaux CCMU, red flags et évaluations cliniques du résumé affiché au patient
3. THE Kiosk_Frontend SHALL afficher un bouton "Confirmer" et un bouton "Corriger" sur l'écran de validation
4. WHEN le patient appuie sur "Corriger", THE Kiosk_Frontend SHALL permettre au patient de relancer une conversation pour corriger ses informations

### Requirement 8: Écran de ticket et QR code

**User Story:** En tant que patient, je veux recevoir un ticket avec un QR code après le pré-triage, afin de pouvoir suivre ma position dans la file d'attente.

#### Acceptance Criteria

1. WHEN la phase `ticket` est active, THE Kiosk_Frontend SHALL générer et afficher un QR_Ticket contenant un QR code unique
2. THE QR_Ticket SHALL afficher un message de réassurance en français indiquant que le patient sera pris en charge
3. THE QR_Ticket SHALL afficher l'heure d'arrivée du patient
4. THE Avatar SHALL afficher l'état d'animation `happy` sur l'écran de ticket
5. THE Kiosk_Frontend SHALL afficher un bouton "Recommencer" pour réinitialiser la borne pour le patient suivant

### Requirement 9: Design et palette de couleurs Mistral

**User Story:** En tant que responsable produit, je veux que l'interface respecte la charte graphique Mistral (orange, ambre, fond sombre), afin de maintenir une identité visuelle cohérente.

#### Acceptance Criteria

1. THE Kiosk_Frontend SHALL utiliser la palette de couleurs Mistral : orange primaire (#FF7000), ambre secondaire (#FFB800), fond sombre (#0F172A), cartes (#1E293B)
2. THE Kiosk_Frontend SHALL utiliser Tailwind CSS pour le styling avec les couleurs personnalisées configurées dans le thème
3. THE Kiosk_Frontend SHALL utiliser Framer Motion pour les animations de transition entre les phases et les animations des composants
4. THE Kiosk_Frontend SHALL être optimisé pour un affichage plein écran sur une borne tactile (orientation portrait ou paysage)

### Requirement 10: Respect de la frontière d'information patient

**User Story:** En tant que responsable médical, je veux que le kiosque patient ne montre jamais les niveaux CCMU, les red flags ou les évaluations cliniques au patient, afin de respecter le protocole de sécurité de l'information.

#### Acceptance Criteria

1. THE Kiosk_Frontend SHALL exclure les champs `recommended_ccmu`, `ccmu_reasoning`, `red_flags`, `clinical_assessment.opqrst`, et `is_urgent` de tout affichage destiné au patient
2. WHEN le Triage_Document est reçu du backend, THE Kiosk_Frontend SHALL extraire uniquement les informations factuelles (motif de consultation, symptômes déclarés, antécédents, médicaments, allergies) pour l'affichage patient
3. THE Kiosk_Frontend SHALL afficher uniquement des messages factuels, de réassurance et des prochaines étapes logistiques au patient

### Requirement 11: Gestion des erreurs et résilience

**User Story:** En tant que patient, je veux que la borne gère les erreurs gracieusement et me guide si quelque chose ne fonctionne pas, afin de ne pas rester bloqué.

#### Acceptance Criteria

1. IF la connexion WebSocket est perdue pendant la phase `conversation`, THEN THE Kiosk_Frontend SHALL afficher un message d'erreur en français et proposer de recommencer
2. IF le backend ne répond pas dans un délai de 30 secondes après l'établissement de la connexion, THEN THE Kiosk_Frontend SHALL afficher un message de timeout et proposer de réessayer
3. IF une erreur audio survient (microphone inaccessible, lecture échouée), THEN THE Kiosk_Frontend SHALL afficher un message d'erreur contextuel en français
4. THE Kiosk_Frontend SHALL afficher tous les messages d'erreur en français avec un langage simple et non technique

### Requirement 12: Protocole WebSocket événementiel

**User Story:** En tant que développeur, je veux un protocole WebSocket structuré basé sur des événements JSON, afin de gérer proprement les différents types de messages entre le frontend et le backend.

#### Acceptance Criteria

1. THE API_Layer SHALL utiliser un protocole événementiel avec les types suivants : `sessionStart`, `audioData`, `textOutput`, `toolUse`, `toolResult`, `sessionEnd`, `error`
2. WHEN le Kiosk_Frontend envoie de l'audio, THE Kiosk_Frontend SHALL envoyer les données PCM brutes en tant que message binaire WebSocket
3. WHEN le Kiosk_Frontend envoie un message texte, THE Kiosk_Frontend SHALL envoyer un message JSON avec le type `textInput` et le contenu
4. THE API_Layer SHALL envoyer chaque événement JSON avec au minimum les champs `type` et `timestamp`
5. IF le backend rencontre une erreur pendant le traitement, THEN THE API_Layer SHALL envoyer un événement `error` avec un champ `message` descriptif
