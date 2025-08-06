import consola from "consola";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const fetchDataAndSave = async () => {
    const url = "https://jsonplaceholder.typicode.com/posts";
    const res = await fetch(url);
    const _data = await res.json();
    const data = {now: new Date(), ...data};

    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString("default", { month: "long" }); // e.g., January

    const dirPath = join("data", `${year}`, month);
    mkdirSync(dirPath, { recursive: true });

    const filePath = join(dirPath, "data.json");
    writeFileSync(filePath, JSON.stringify(data, null, 2));

    consola.success(`Saved data to ${filePath}`);
};

fetchDataAndSave().catch(e => consola.error(e));
