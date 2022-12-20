import path from "path";
import sqlite, {
  Database as BetterSqlite3Database,
  Statement,
} from "better-sqlite3";
import { createStatements, staticStatements } from "./staticStatements";

type RecursiveObject = { [key: string]: string | RecursiveObject };
type RecursiveReplace<TSource, TReplacement> = {
  [name in keyof TSource]: TSource[name] extends string
    ? TReplacement
    : RecursiveReplace<TSource[name], TReplacement>;
};

export default class Database {
  sqliteDatabase: BetterSqlite3Database;
  createStatements: RecursiveReplace<typeof createStatements, Statement>;
  preparedStatements: RecursiveReplace<typeof staticStatements, Statement>;

  constructor(name: string) {
    try {
      this.sqliteDatabase = sqlite(path.resolve(__dirname, `${name}.db3`));
      this.createStatements = this.recursivePrepare(createStatements);
      // Must create the tables before we can prepare the other statements.
      this.createTables();
      this.preparedStatements = this.recursivePrepare(staticStatements);
    } catch (error) {
      console.error(error);
      throw new Error(
        `Could not initialize the database. It might be unreadable or corrupted. Check the read/write permissions, or remove the database file and try again.\n${error}`
      );
    }
  }

  close() {
    this.sqliteDatabase.close();
  }

  beginTransaction() {
    this.preparedStatements.beginTransaction.run();
  }

  commitTransaction() {
    this.preparedStatements.commitTransaction.run();
  }

  private recursivePrepare<TSource extends RecursiveObject>(
    statements: TSource
  ): RecursiveReplace<TSource, Statement> {
    const prepared: any = {};
    for (const key in statements) {
      const entry = statements[key];
      if (typeof entry === "string") {
        prepared[key] = this.sqliteDatabase.prepare(entry);
      } else {
        prepared[key] = this.recursivePrepare(entry);
      }
    }
    return prepared;
  }

  private createTables() {
    console.error("CREATING TABLES");
    this.createStatements.levels.run();
    this.createStatements.users.run();
    this.createStatements.runs.run();
    console.error("DONE CREATING TABLES");
  }
}
