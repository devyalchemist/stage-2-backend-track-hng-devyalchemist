/**
 * Generates a random float between 1000 and 2000.
 */
export const getRandomMultiplier = () => {
  return Math.random() * (2000 - 1000) + 1000;
};