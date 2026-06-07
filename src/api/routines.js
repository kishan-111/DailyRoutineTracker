const ROUTINES_URL = `${import.meta.env.BASE_URL}data/routines.json`;

export async function fetchRoutineData() {
  const response = await fetch(ROUTINES_URL);

  if (!response.ok) {
    throw new Error(`Failed to load routine data (${response.status})`);
  }

  return response.json();
}
