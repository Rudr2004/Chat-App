
import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userSlice.jsx'
export default configureStore({
  reducer: {
    user : userReducer
  },
})