import type {Db} from './db';
import type {User} from '../../domain/types';

export interface UserRecord extends User { password_hash: string; password_salt: string }

export const users = {
  create: (db: Db, u: UserRecord) =>
    db.prepare('INSERT INTO users(id,username,email,password_hash,password_salt) VALUES(?,?,?,?,?)')
      .bind(u.id, u.username, u.email, u.password_hash, u.password_salt).run(),

  /** Login accepts either the email or the username (both are unique, case-insensitive). */
  byLogin: (db: Db, identifier: string) =>
    db.prepare('SELECT id,username,email,password_hash,password_salt FROM users WHERE email=?1 OR username=?1').bind(identifier).first<UserRecord>()
};
