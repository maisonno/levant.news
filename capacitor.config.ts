import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'news.levant.app',
  appName: 'Levant.news',

  // L'app charge directement le site en production.
  // Le webDir sert de fallback hors-ligne (page d'attente).
  webDir: 'capacitor-fallback',

  server: {
    url: 'https://levant.news',
    cleartext: false,
    // Autorise les redirections OAuth/Supabase
    allowNavigation: [
      'levant.news',
      '*.supabase.co',
      '*.supabase.io',
    ],
  },

  ios: {
    contentInset: 'always',           // respecte le notch / Dynamic Island
    backgroundColor: '#0a1f4e',       // couleur de fond pendant le chargement
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a1f4e',
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'Light',                 // texte blanc sur fond sombre
      backgroundColor: '#0a1f4e',
      overlaysWebView: false,
    },
  },
}

export default config
