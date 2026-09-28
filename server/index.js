import { createServer } from "http";
import app from "./src/app.js";
import { PORT } from "./src/common/config/envConfig.js";
import connectDB from "./src/common/config/db.js";

function main() {
  try {
    const server = createServer(app);

    connectDB();

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}

main();
