import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const BACKEND_URI = process.env.REACT_APP_BACKEND_URI || '';

const passwordRules = [
  { regex: /.{8,}/, label: 'at least 8 characters' },
  { regex: /[A-Z]/, label: 'an uppercase letter' },
  { regex: /[a-z]/, label: 'a lowercase letter' },
  { regex: /[0-9]/, label: 'a number' },
  { regex: /[^A-Za-z0-9]/, label: 'a special character' },
];

const SecuritySettings = () => {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [resendError, setResendError] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      setError("");
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`${BACKEND_URI}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        //console.log(res);
        if (!res.ok) {
          //console.log('Could not fetch security info.');
          let msg = `Could not fetch security info. (${res.status} ${res.statusText})`;
          try {
            const errData = await res.json();
            if (errData && errData.error) msg = errData.error;
          } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        //console.log(data);
        setEmail(data.email);
        setProvider(data.identities[0].provider);
        setEmailVerified(data.email_verified);
      } catch (e) {
        setError(e.message || 'Could not fetch security info.');
      }
      setLoading(false);
    };
    if (isAuthenticated) fetchMe();
  }, [isAuthenticated, getAccessTokenSilently]);

  const handleResend = async () => {
    setResendStatus('');
    setResendError('');
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BACKEND_URI}/api/profile/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setResendStatus('Verification email sent.');
      } else {
        setResendError('Could not send verification email. Please try again.');
      }
    } catch {
      setResendError('Could not send verification email. Please try again.');
    }
  };

  const validatePassword = (pw) =>
    passwordRules.every((rule) => rule.regex.test(pw));

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError('All fields are required.');
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwNew === pwCurrent) {
      setPwError('New password must be different from the current password.');
      return;
    }
    if (!validatePassword(pwNew)) {
      setPwError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }
    setPwLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BACKEND_URI}/api/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current: pwCurrent, new: pwNew }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwSuccess('Password updated successfully.');
        setPwCurrent('');
        setPwNew('');
        setPwConfirm('');
      } else {
        if (data.code === 'INCORRECT_CURRENT') setPwError('Current password is incorrect.');
        else if (data.code === 'WEAK') setPwError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
        else if (data.code === 'SAME_AS_OLD') setPwError('New password must be different from the current password.');
        else setPwError('Could not update password. Please try again.');
      }
    } catch {
      setPwError('Could not update password. Please try again.');
    }
    setPwLoading(false);
  };
  //console.log(isLoading, loading, isAuthenticated);

  if (isLoading ||loading) return <div className="flex justify-center items-center min-h-[40vh] text-lg text-gray-600">Loading...</div>;
  if (!isAuthenticated) return <div className="flex justify-center items-center min-h-[40vh] text-lg text-gray-600">Please log in</div>;

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded text-center font-medium">
          {error}
        </div>
      )}
      <div>
        <div className="mb-6">
          <div className="mb-1 text-lg font-semibold text-gray-700">Email</div>
          <div className="mb-2 text-gray-900 text-lg font-mono break-all">{email}</div>
          {provider === 'google-oauth2' ? (
            <>
              <span className="inline-block px-3 py-1 rounded bg-green-100 text-green-700 text-sm font-medium mb-2">Verified via Google</span>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm font-medium flex items-center gap-2">
                You signed up with Google. To change your email or password, please manage your account via Google Account settings. These options are not available here for social login users.
              </div>
            </>
          ) : (
            <>
              {emailVerified ? (
                <span className="inline-block px-3 py-1 rounded bg-green-100 text-green-700 text-sm font-medium">Verified</span>
              ) : (
                <>
                  <span className="inline-block px-3 py-1 rounded bg-yellow-100 text-yellow-800 text-sm font-medium mb-2">Your email is not verified.</span>
                  <div>
                    <button
                      className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 transition text-white rounded shadow disabled:opacity-50"
                      onClick={handleResend}
                      disabled={!!resendStatus}
                    >
                      Resend verification email
                    </button>
                  </div>
                  {resendStatus && <div className="text-green-600 mt-2 font-medium">{resendStatus}</div>}
                  {resendError && <div className="text-red-600 mt-2 font-medium">{resendError}</div>}
                </>
              )}
            </>
          )}
        </div>
        {provider !== 'google-oauth2' && (
          <form onSubmit={handleChangePassword} className="space-y-5 bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="font-semibold text-lg mb-2 text-gray-700">Change Password</div>
            <div className="space-y-3">
              <input
                type="password"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Current password"
                value={pwCurrent}
                onChange={e => setPwCurrent(e.target.value)}
                disabled={pwLoading}
                autoComplete="current-password"
              />
              <input
                type="password"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="New password"
                value={pwNew}
                onChange={e => setPwNew(e.target.value)}
                disabled={pwLoading}
                autoComplete="new-password"
              />
              <input
                type="password"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Confirm new password"
                value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                disabled={pwLoading}
                autoComplete="new-password"
              />
            </div>
            {pwError && <div className="text-red-600 font-medium text-sm mt-1">{pwError}</div>}
            {pwSuccess && <div className="text-green-600 font-medium text-sm mt-1">{pwSuccess}</div>}
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 transition text-white rounded font-semibold disabled:opacity-50 shadow"
              disabled={pwLoading}
            >
              {pwLoading ? 'Saving...' : 'Save'}
            </button>
            <div className="text-xs text-gray-500 mt-2">
              Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default SecuritySettings; 