import { seedCategories } from "./seeders/CategorySeeder.js";
import { seedCity } from "./seeders/CitySeeder.js";
import { seedInstitutionTypes } from "./seeders/InstitutionTypeSeeder.js";
import { seedProvince } from "./seeders/ProvinceSeeder.js";
import { seedRoles } from "./seeders/RoleSeeder.js";
import { seedUser } from "./seeders/UserSeeder.js";
import { seedQuestions } from "./seeders/QuestionSeeder.js";
import { seedQuesioners } from "./seeders/QuesionerSeeder.js";
import { seedOptions } from "./seeders/OptionSeeder.js";
import { seedClasses } from "./seeders/ClassesSeeder.js";
import { seedJobTypes } from "./seeders/JobTypeSeeder.js";
import { seedNutritionStatus } from "./seeders/NutritionStatusSeeder.js";

async function main() {
  console.log("Starting seeding process...");

  await seedRoles();
  await seedUser();
  await seedInstitutionTypes();
  await seedProvince();
  await seedCity();
  await seedCategories();
  await seedQuesioners();
  await seedQuestions();
  await seedOptions();
  await seedClasses();
  await seedJobTypes();
  await seedNutritionStatus();

  console.log("Seeding process completed!");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error during seeding:", error);
    process.exit(1);
  });
