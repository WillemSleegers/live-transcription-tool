import '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    timestampNode: {
      /**
       * Insert a timestamp node at the current position
       */
      insertTimestamp: (time?: number) => ReturnType
    }
  }
}
