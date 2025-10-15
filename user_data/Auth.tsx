import React, { useState } from 'react';
import { authService, User } from '../Mimic_backend/services.ts';

export const AuthPage: React.FC<{ onLoginSuccess: (user: User) => void }> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate network delay
        setTimeout(() => {
            if (isLogin) {
                const result = authService.login(username, password);
                if (result.success && result.user) {
                    onLoginSuccess(result.user);
                } else {
                    setError(result.message);
                }
            } else {
                if (password.length < 6) {
                     setError('Password must be at least 6 characters long.');
                     setLoading(false);
                     return;
                }
                if (password !== confirmPassword) {
                    setError('Passwords do not match.');
                    setLoading(false);
                    return;
                }
                if (!username.trim() || !password.trim()) {
                    setError('Username and password cannot be empty.');
                    setLoading(false);
                    return;
                }
                const result = authService.register(username, password);
                if (result.success) {
                    // Automatically log in after successful registration
                    const loginResult = authService.login(username, password);
                    if (loginResult.success && loginResult.user) {
                        onLoginSuccess(loginResult.user);
                    } else {
                         setError('Registration successful, but login failed. Please log in manually.');
                    }
                } else {
                    setError(result.message);
                }
            }
            setLoading(false);
        }, 500);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>INVICTUS</h1>
                    <p>Your Personal AI Mentor for UPSC</p>
                </div>
                <h2>{isLogin ? 'Login' : 'Register'}</h2>
                <form onSubmit={handleSubmit}>
                    {error && <p className="auth-error">{error}</p>}
                    <div className="auth-form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            aria-required="true"
                            aria-invalid={!!error}
                        />
                    </div>
                    <div className="auth-form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            aria-required="true"
                            aria-invalid={!!error}
                        />
                    </div>
                    {!isLogin && (
                        <div className="auth-form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                aria-required="true"
                                aria-invalid={!!error && error.includes('match')}
                            />
                        </div>
                    )}
                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>
                <p className="auth-switch">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                        {isLogin ? 'Register' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};
