import React, { createContext, useContext, useState } from 'react';

// Create the context
const MessageContext = createContext();

// Create a provider component
export function MessageProvider({ children }) {
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'success' or 'error'

  const setSuccessMessage = (msg) => {
    console.log(msg)
    setMessage(msg);
    setMessageType('success');
  };

  const setErrorMessage = (msg) => {
    setMessage(msg);
    setMessageType('error');
  };

  const clearMessage = () => {
    setMessage(null);
    setMessageType(null);
  };

  return (
    <MessageContext.Provider value={{ message, messageType, setSuccessMessage, setErrorMessage, clearMessage }}>
      {children}
    </MessageContext.Provider>
  );
}

// Create a custom hook for easy access to the context
export function useMessage() {
  return useContext(MessageContext);
}
