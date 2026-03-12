import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Player, Game, Tournament } from '../models/types';

async function requireAdmin(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  const token = await user.getIdTokenResult();
  if (token.claims.admin !== true) throw new Error('Admin access required');
}

// ---- Players ----
const playersCol = () => collection(db, 'players');

export async function getPlayers(): Promise<Player[]> {
  const snap = await getDocs(query(playersCol(), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
}

export async function addPlayer(name: string): Promise<Player> {
  await requireAdmin();
  const ref = await addDoc(playersCol(), { name, createdAt: Date.now() });
  return { id: ref.id, name, createdAt: Date.now() };
}

export function onPlayersChange(cb: (players: Player[]) => void): Unsubscribe {
  return onSnapshot(query(playersCol(), orderBy('name')), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player)));
  });
}

// ---- Games ----
const gamesCol = () => collection(db, 'games');

export async function getGames(): Promise<Game[]> {
  const snap = await getDocs(query(gamesCol(), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Game));
}

export async function getGamesByTournament(tournamentId: string): Promise<Game[]> {
  const snap = await getDocs(
    query(gamesCol(), where('tournamentId', '==', tournamentId), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Game));
}

export async function addGame(game: Omit<Game, 'id'>): Promise<string> {
  await requireAdmin();
  const ref = await addDoc(gamesCol(), game);
  return ref.id;
}

export async function updateGame(id: string, data: Partial<Game>): Promise<void> {
  await requireAdmin();
  await updateDoc(doc(db, 'games', id), data);
}

export function onGamesChange(cb: (games: Game[]) => void): Unsubscribe {
  return onSnapshot(query(gamesCol(), orderBy('createdAt', 'desc')), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Game)));
  });
}

// ---- Tournaments ----
const tournamentsCol = () => collection(db, 'tournaments');

export async function getTournaments(): Promise<Tournament[]> {
  const snap = await getDocs(query(tournamentsCol(), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const snap = await getDoc(doc(db, 'tournaments', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Tournament;
}

export async function addTournament(t: Omit<Tournament, 'id'>): Promise<string> {
  await requireAdmin();
  const ref = await addDoc(tournamentsCol(), t);
  return ref.id;
}

export async function updateTournament(id: string, data: Partial<Tournament>): Promise<void> {
  await requireAdmin();
  await updateDoc(doc(db, 'tournaments', id), data);
}

export function onTournamentChange(id: string, cb: (t: Tournament | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'tournaments', id), (snap) => {
    if (!snap.exists()) return cb(null);
    cb({ id: snap.id, ...snap.data() } as Tournament);
  });
}

export function onTournamentsChange(cb: (ts: Tournament[]) => void): Unsubscribe {
  return onSnapshot(query(tournamentsCol(), orderBy('createdAt', 'desc')), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament)));
  });
}

export async function deleteTournament(id: string): Promise<void> {
  await requireAdmin();
  const batch = writeBatch(db);
  const gamesSnap = await getDocs(
    query(gamesCol(), where('tournamentId', '==', id))
  );
  gamesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'tournaments', id));
  await batch.commit();
}
