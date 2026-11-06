import React from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import App from "./App.jsx";
import "@aws-amplify/ui-react/styles.css";
import "./styles.css";

const { VITE_AWS_REGION, VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_USER_POOL_CLIENT_ID } =
  import.meta.env;

if (!VITE_AWS_REGION || !VITE_COGNITO_USER_POOL_ID || !VITE_COGNITO_USER_POOL_CLIENT_ID) {
  throw new Error(
    "Set VITE_AWS_REGION, VITE_COGNITO_USER_POOL_ID, and VITE_COGNITO_USER_POOL_CLIENT_ID to enable sign-in.",
  );
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: VITE_COGNITO_USER_POOL_CLIENT_ID,
      loginWith: { email: true },
    },
  },
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Authenticator loginMechanisms={["email"]} signUpAttributes={["email"]}>
      <App />
    </Authenticator>
  </React.StrictMode>,
);
