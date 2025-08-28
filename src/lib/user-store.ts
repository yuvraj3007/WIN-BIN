'use server';

import { kv } from '@vercel/kv';

// --- Data Structures ---
// These interfaces remain the same as they define the shape of our data.

export interface Bottle {
  id: string;
  type: string;
  sizeMl: number;
  timestamp: number;
}

export interface UserData {
  name: string;
  mobile: string;
  bottles: Bottle[];
  ecoCoins: number;
}

// --- Helper Function to create a consistent key for the database ---
/**
 * Creates a standardized key for storing and retrieving user data from KV.
 * @param mobile The user's mobile number.
 * @returns A string in the format "user:[mobile]".
 */
function getUserKey(mobile: string): string {
  return `user:${mobile}`;
}


// --- Public API Functions for User Management (Refactored for Vercel KV) ---

/**
 * Retrieves a user's data from the Vercel KV store.
 * @param mobile The user's mobile number (acts as a unique ID).
 * @returns The user's data or null if not found.
 */
export async function getUser(mobile: string): Promise<UserData | null> {
  try {
    const userKey = getUserKey(mobile);
    // Directly get the data for a single user using their key.
    // This is much more efficient than reading an entire file.
    const userData = await kv.get<UserData>(userKey);
    return userData;
  } catch (error) {
    console.error(`Failed to get user ${mobile}:`, error);
    return null;
  }
}

/**
 * Creates a new user and adds them to the Vercel KV store.
 * @param name The user's name.
 * @param mobile The user's mobile number.
 * @returns The newly created user's data or null if the user already exists.
 */
export async function createUser(name: string, mobile: string): Promise<UserData | null> {
  try {
    const userKey = getUserKey(mobile);

    // First, check if the user already exists to avoid overwriting them.
    const existingUser = await kv.get(userKey);
    if (existingUser) {
      console.warn(`User with mobile ${mobile} already exists.`);
      // Return the existing user data instead of creating a new one.
      return existingUser as UserData;
    }

    const newUser: UserData = {
      name,
      mobile,
      bottles: [],
      ecoCoins: 0,
    };

    // Use kv.set() to save the new user object to the database.
    await kv.set(userKey, newUser);

    return newUser;
  } catch (error) {
    console.error(`Failed to create user ${mobile}:`, error);
    return null;
  }
}

/**
 * Updates an existing user's data in the Vercel KV store.
 * @param mobile The mobile number of the user to update.
 * @param updates A partial object of the user's data to update.
 * @returns The updated user data, or null if the user was not found.
 */
export async function updateUser(mobile: string, updates: Partial<UserData>): Promise<UserData | null> {
  try {
    const userKey = getUserKey(mobile);

    // 1. GET the current user data from the database.
    const currentUserData = await kv.get<UserData>(userKey);

    if (!currentUserData) {
      console.error(`User with mobile ${mobile} not found for update.`);
      return null;
    }

    // 2. MERGE the existing data with the new updates in memory.
    const updatedUserData: UserData = { ...currentUserData, ...updates };
    
    // 3. SET the newly merged object back into the database, overwriting the old one.
    await kv.set(userKey, updatedUserData);

    return updatedUserData;
  } catch (error) {
    console.error(`Failed to update user ${mobile}:`, error);
    return null;
  }
}

/**
 * A specific update function to add a bottle to a user's list.
 * This is a good practice to ensure data integrity.
 * @param mobile The mobile number of the user.
 * @param newBottle The new bottle object to add.
 * @returns The fully updated user data, or null on failure.
 */
export async function addBottleToUser(mobile: string, newBottle: Bottle): Promise<UserData | null> {
    try {
        const userKey = getUserKey(mobile);

        // 1. GET the current user
        const currentUserData = await kv.get<UserData>(userKey);
        if (!currentUserData) {
            console.error(`User with mobile ${mobile} not found to add bottle.`);
            return null;
        }

        // 2. MODIFY the data: push the new bottle and update ecoCoins
        const updatedBottles = [...currentUserData.bottles, newBottle];
        const updatedEcoCoins = currentUserData.ecoCoins + 10; // Example: Add 10 coins per bottle

        const updatedUserData: UserData = {
            ...currentUserData,
            bottles: updatedBottles,
            ecoCoins: updatedEcoCoins,
        };

        // 3. SET the new state back to the database
        await kv.set(userKey, updatedUserData);

        return updatedUserData;

    } catch (error) {
        console.error(`Failed to add bottle for user ${mobile}:`, error);
        return null;
    }
}
