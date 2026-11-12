import { openDB } from "idb";
import { databaseSchema, initialDatabase, type Database } from "./domain";

const db = () =>
  openDB("portrait-studio", 1, {
    upgrade(database) {
      database.createObjectStore("workspace");
    },
  });
export async function loadDatabase(): Promise<Database> {
  const database = await db();
  const value = await database.get("workspace", "data");
  return value ? databaseSchema.parse(value) : initialDatabase();
}
export async function persistDatabase(value: Database) {
  const database = await db();
  await database.put("workspace", value, "data");
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[\\/:*?"<>|]/g, "-");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
