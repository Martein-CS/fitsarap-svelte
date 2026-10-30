import type {Db} from './db';
import type {User} from '../../domain/types';

export const sessions = {
  create: (db: Db, tokenHash: string, userId: string, expiresAt: number) =>
    db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(tokenHash, userId, expiresAt).run(),

  user: (db: Db, tokenHash: string, now: number) =>
    db.prepare('SELECT users.id, users.username, users.email FROM sessions JOIN users ON sessions.user_id=users.id WHERE sessions.token_hash=? AND sessions.expires_at>?')
      .bind(tokenHash, now).first<User>(),

  delete: (db: Db, tokenHash: string) => db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(tokenHash).run(),

  /** Removes expired sessions (run by the jobs Worker's cron, and occasionally after a login). Uses sessions_expires_idx. */
  purgeExpired: (db: Db, now: number) => db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now).run()
};
