import React from 'react';
import { SignIn2 } from '../../components/ui/clean-minimal-sign-in';

export const LoginForm = ({
  form,
  setForm,
  loading,
  error,
  onSubmit,
}) => {
  const handleAuthSubmit = ({ email, password }) => {
    setForm({ email, password });
    // Trigger submission
    onSubmit({ preventDefault: () => {} });
  };

  return (
    <div className="lw-right flex items-center justify-center">
      <SignIn2
        onSignIn={handleAuthSubmit}
        externalError={error}
        loading={loading}
      />
    </div>
  );
};

export default LoginForm;
