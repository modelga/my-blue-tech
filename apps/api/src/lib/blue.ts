import { Blue } from "@blue-labs/language";
import { repository } from "@blue-repository/types";

// Singleton — mirrors the pattern in blue-side-app/myos.test.ts:
//   const blue = new Blue({ repositories: [repository] });
export const blue = new Blue({ repositories: [repository] });
