import { prisma } from './config/config';

async function verify() {
  console.log('Fetching database metrics...');
  const customerCount = await prisma.customer.count();
  const orderCount = await prisma.order.count();
  const segmentCount = await prisma.segment.count();

  console.log('\n=== Database Verification Report ===');
  console.log(`Total Customers in DB: ${customerCount} (Expected: 500)`);
  console.log(`Total Orders in DB   : ${orderCount} (Expected: ~2000)`);
  console.log(`Total Segments in DB : ${segmentCount} (Expected: >= 2)`);

  const customerOk = customerCount === 500;
  const ordersOk = orderCount >= 1900 && orderCount <= 2100;
  const segmentsOk = segmentCount >= 2;

  if (customerOk && ordersOk && segmentsOk) {
    console.log('\n✅ Database seeding verification PASSED!');
    process.exit(0);
  } else {
    console.error('\n❌ Database seeding verification FAILED!');
    process.exit(1);
  }
}

verify()
  .catch((err) => {
    console.error('Verification crashed:', err);
    process.exit(1);
  });
