import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    // reducerをここに追加できます
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;