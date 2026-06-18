import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const recurring = await prisma.recurringTransaction.findFirst();
    console.log('Found recurring transaction:', recurring);
    if (recurring) {
      const cleanName = (recurring.category || 'Miscellaneous').trim();
      let category = await prisma.category.findUnique({
        where: { name: cleanName }
      });
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: cleanName,
            icon: 'HelpCircle',
            color: '#6b7280',
            isSystem: false
          }
        });
        console.log('Created Category:', category);
      } else {
        console.log('Found Category:', category);
      }
      
      const numAmount = Math.abs(recurring.amount);
      const signedAmt = recurring.type === 'EXPENSE' ? -numAmount : numAmount;
      
      const newTxn = await prisma.transaction.create({
        data: {
          userId: recurring.userId,
          transactionDate: new Date(),
          description: `${recurring.description} (Recurring)`,
          amount: signedAmt,
          transactionType: recurring.type === 'INCOME' ? 'Income' : 'Expense',
          categoryId: category.id,
          subcategoryId: recurring.subcategory || 'General',
          paymentMethod: recurring.paymentMethod || 'Direct Debit',
          accountId: recurring.account || 'SBI',
          note: recurring.notes || `Automatically generated from schedule ID: ${recurring.id}`,
          tags: recurring.tags || ''
        }
      });
      console.log('Successfully created transaction:', newTxn);
    } else {
      console.log('No recurring transactions found in database.');
    }
  } catch (err) {
    console.error('Error running test_approve:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
