// --- TYPE DEFINITIONS ---
export type User = {
    username: string;
    // In a real app, this would be a hashed password
    password: string;
};

export type UserData = {
    chats: any[]; // Using 'any' for simplicity to match existing structure
    evaluations: any[];
    quizzes: any[];
    interviews: any[];
    pyqAnalyses: any[];
    essayOutlines: any[];
    mentorCalls: any[];
    notesPro: any[];
    mentorModes: any[];
    chronoScouts: any[];
    anthropologyAnalyses: any[];
    mindMaps: any[];
    activeItemId: string | null;
};


// --- LOCAL STORAGE KEYS ---
const USERS_KEY = 'invictus-users';
const CURRENT_USER_KEY = 'invictus-current-user';


// --- AUTH SERVICE ---
export const authService = {
    register: (username: string, password: string): { success: boolean; message: string } => {
        const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, message: 'Username already exists.' };
        }
        users.push({ username, password });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return { success: true, message: 'Registration successful.' };
    },

    login: (username: string, password: string): { success: boolean; message: string; user?: User } => {
        const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user && user.password === password) {
            // Return the user with the original casing
            const loggedInUser = { ...user, username: user.username };
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedInUser));
            return { success: true, message: 'Login successful.', user: loggedInUser };
        }
        return { success: false, message: 'Invalid username or password.' };
    },

    logout: (): void => {
        localStorage.removeItem(CURRENT_USER_KEY);
    },

    getCurrentUser: (): User | null => {
        const userJson = localStorage.getItem(CURRENT_USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    },

    deleteAccount: (username: string): { success: boolean; message: string } => {
        let users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const userExists = users.some(user => user.username.toLowerCase() === username.toLowerCase());
        
        if (!userExists) {
            return { success: false, message: 'User not found.' };
        }

        // Delete user data
        dataService.deleteUserData(username);

        // Delete user account
        users = users.filter(user => user.username.toLowerCase() !== username.toLowerCase());
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        // Log out
        authService.logout();

        return { success: true, message: 'Account deleted successfully.' };
    }
};


// --- DATA SERVICE ---
const getDataKey = (username: string) => `invictus-data-${username.toLowerCase()}`;

export const dataService = {
    loadUserData: (username: string): UserData => {
        const dataJson = localStorage.getItem(getDataKey(username));
        if (dataJson) {
            return JSON.parse(dataJson);
        }
        // Return default structure for a new user
        return { chats: [], evaluations: [], quizzes: [], interviews: [], pyqAnalyses: [], essayOutlines: [], mentorCalls: [], notesPro: [], mentorModes: [], chronoScouts: [], anthropologyAnalyses: [], mindMaps: [], activeItemId: null };
    },

    saveUserData: (username: string, data: UserData): void => {
        localStorage.setItem(getDataKey(username), JSON.stringify(data));
    },

    deleteUserData: (username: string): void => {
        localStorage.removeItem(getDataKey(username));
    }
};