import { roundRobin } from "./simulate";

async function main() {
  console.log("Simulating games");

  await roundRobin(['random', 'ismcts1000'], 1);

  console.log("Complete");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
