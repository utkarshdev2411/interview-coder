import Store from "electron-store"

interface StoreSchema {
  openaiApiKey: string | null
}

export const store = new Store<StoreSchema>({
  defaults: {
    openaiApiKey: null
  },

  encryptionKey: "your-encryption-key"
})
