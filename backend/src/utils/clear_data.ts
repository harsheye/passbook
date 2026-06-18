import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing fake transaction, budget, schedules, and gambling logs...');
  
  const deletedTxReceipts = await prisma.transactionReceipt.deleteMany({});
  const deletedTxns = await prisma.transaction.deleteMany({});
  const deletedBudgets = await prisma.budget.deleteMany({});
  const deletedSchedules = await prisma.recurringTransaction.deleteMany({});
  const deletedGamblingEntries = await prisma.gamblingEntry.deleteMany({});
  const deletedGamblingPlatforms = await prisma.gamblingPlatform.deleteMany({});

  console.log(`Deleted ${deletedTxReceipts.count} receipts`);
  console.log(`Deleted ${deletedTxns.count} transactions`);
  console.log(`Deleted ${deletedBudgets.count} budgets`);
  console.log(`Deleted ${deletedSchedules.count} schedules`);
  console.log(`Deleted ${deletedGamblingEntries.count} gambling entries`);
  console.log(`Deleted ${deletedGamblingPlatforms.count} gambling platforms`);
  
  console.log('Database cleared of fake data successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
