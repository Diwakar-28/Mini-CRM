import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad', 'Jaipur', 'Ahmedabad', 'Gurugram'];
const TAGS_CATALOG = ['vip', 'active', 'inactive', 'churn-risk', 'new-user', 'tech-enthusiast', 'frequent-buyer', 'discount-shopper'];
const PRODUCT_CATALOG = [
  { name: 'Wireless Headphones', price: 2999 },
  { name: 'Mechanical Keyboard', price: 4500 },
  { name: 'Ergonomic Mouse', price: 1999 },
  { name: '4K Monitor', price: 24999 },
  { name: 'USB-C Hub', price: 1499 },
  { name: 'Smart Watch', price: 5999 },
  { name: 'Leather Wallet', price: 999 },
  { name: 'Duffle Gym Bag', price: 1799 },
  { name: 'Stainless Steel Flask', price: 899 },
  { name: 'Minimalist Desk Mat', price: 1199 },
];

const FIRST_NAMES = [
  'Amit', 'Rahul', 'Priya', 'Sneha', 'Vikram', 'Ananya', 'Rohan', 'Neha', 'Aditya', 'Riya',
  'Sandeep', 'Pooja', 'Abhishek', 'Shweta', 'Rajesh', 'Divya', 'Sanjay', 'Deepika', 'Karan', 'Sunita',
  'John', 'Sarah', 'David', 'Emma', 'Michael', 'Olivia', 'James', 'Sophia', 'Robert', 'Isabella'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Sen', 'Joshi', 'Mehta', 'Nair', 'Singh', 'Reddy',
  'Rao', 'Das', 'Roy', 'Choudhury', 'Bose', 'Kumar', 'Kapoor', 'Malhotra', 'Mishra', 'Prasad',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'
];

async function main() {
  console.log('Clearing database...');
  await prisma.communicationEvent.deleteMany({});
  await prisma.campaignRecipient.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.segment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});

  console.log('Generating 500 customers...');
  const customersData: any[] = [];
  const emailsSet = new Set<string>();

  for (let i = 0; i < 500; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${firstName} ${lastName}`;
    
    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@example.com`;
    // Ensure uniqueness
    while (emailsSet.has(email)) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 10000)}@example.com`;
    }
    emailsSet.add(email);

    const phone = `+91 ${9000000000 + Math.floor(Math.random() * 1000000000)}`;
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];
    
    // Choose 1-3 random tags
    const numTags = 1 + Math.floor(Math.random() * 3);
    const selectedTags: string[] = [];
    while (selectedTags.length < numTags) {
      const tag = TAGS_CATALOG[Math.floor(Math.random() * TAGS_CATALOG.length)];
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
      }
    }

    customersData.push({
      name,
      email,
      phone,
      city,
      tags: JSON.stringify(selectedTags),
      totalSpend: 0,
      totalOrders: 0,
      lastOrderDate: null,
    });
  }

  // Bulk create customers
  console.log('Saving customers to SQLite...');
  const createdCustomers = [];
  for (const customer of customersData) {
    const dbCustomer = await prisma.customer.create({
      data: customer,
    });
    createdCustomers.push(dbCustomer);
  }

  console.log(`Successfully created ${createdCustomers.length} customers.`);

  console.log('Generating approximately 2000 orders...');
  const ordersToInsert = [];
  const totalOrdersToGenerate = 2000;
  
  // Distribute ~4 orders per customer on average
  // Each customer gets a random base count, we fine-tune it to hit exactly ~2000 orders
  const customerOrderCounts = createdCustomers.map((c) => ({
    customerId: c.id,
    count: 0
  }));

  // Distribute 2000 orders across customers
  for (let i = 0; i < totalOrdersToGenerate; i++) {
    const randomCustomerIndex = Math.floor(Math.random() * createdCustomers.length);
    customerOrderCounts[randomCustomerIndex].count++;
  }

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1); // 1 year ago

  for (const customerCount of customerOrderCounts) {
    const customerId = customerCount.customerId;
    const count = customerCount.count;

    for (let j = 0; j < count; j++) {
      // Pick random items
      const numItems = 1 + Math.floor(Math.random() * 3);
      const itemsList = [];
      let orderValue = 0;

      for (let k = 0; k < numItems; k++) {
        const itemTemplate = PRODUCT_CATALOG[Math.floor(Math.random() * PRODUCT_CATALOG.length)];
        const qty = 1 + Math.floor(Math.random() * 2);
        itemsList.push({
          name: itemTemplate.name,
          qty,
          price: itemTemplate.price,
        });
        orderValue += itemTemplate.price * qty;
      }

      // Generate random order date in the past year
      const orderDate = new Date(startDate.getTime() + Math.random() * (new Date().getTime() - startDate.getTime()));
      const status = Math.random() < 0.05 ? 'cancelled' : Math.random() < 0.10 ? 'placed' : 'fulfilled';

      ordersToInsert.push({
        customerId,
        orderValue,
        items: JSON.stringify(itemsList),
        orderDate,
        status,
      });
    }
  }

  console.log(`Saving ${ordersToInsert.length} orders to database...`);
  // Insert orders
  const batchSize = 100;
  for (let i = 0; i < ordersToInsert.length; i += batchSize) {
    const batch = ordersToInsert.slice(i, i + batchSize);
    await Promise.all(
      batch.map((order) =>
        prisma.order.create({
          data: order,
        })
      )
    );
  }
  console.log('Orders inserted successfully.');

  console.log('Updating customer aggregate metrics (spend, orders, last order date)...');
  // Read all orders to compute customer stats
  const allOrders = await prisma.order.findMany({});
  
  // Calculate mapping
  const customerStats = new Map<string, { totalSpend: number; totalOrders: number; lastOrderDate: Date }>();
  
  for (const order of allOrders) {
    const stat = customerStats.get(order.customerId) || { totalSpend: 0, totalOrders: 0, lastOrderDate: new Date(0) };
    
    // Add spend for non-cancelled orders
    if (order.status !== 'cancelled') {
      stat.totalSpend += order.orderValue;
      stat.totalOrders += 1;
    }
    
    const oDate = new Date(order.orderDate);
    if (oDate > stat.lastOrderDate) {
      stat.lastOrderDate = oDate;
    }
    customerStats.set(order.customerId, stat);
  }

  // Perform updates in chunks
  console.log('Writing aggregate metrics back to customers table...');
  const customerIds = createdCustomers.map((c) => c.id);
  
  for (const customerId of customerIds) {
    const stats = customerStats.get(customerId);
    if (stats) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          totalSpend: Math.round(stats.totalSpend * 100) / 100,
          totalOrders: stats.totalOrders,
          lastOrderDate: stats.totalOrders > 0 ? stats.lastOrderDate : null,
        },
      });
    }
  }
  console.log('Customer aggregate metrics updated successfully.');

  console.log('Seeding initial sample segments...');
  // Segment 1: Delhi High Spenders
  const rulesDelhi = {
    cities: ['Delhi'],
    minSpend: 10000,
    minOrders: 2,
  };
  await prisma.segment.create({
    data: {
      name: 'Delhi High Spenders',
      description: 'Customers from Delhi with total spend of ₹10,000 or more and at least 2 orders.',
      rulesJson: JSON.stringify(rulesDelhi),
      naturalLanguageQuery: 'Delhi customers who spent at least 10000 and placed 2 or more orders',
      createdBy: 'manual',
    },
  });

  // Segment 2: VIP Clients (Globally)
  const rulesVip = {
    minSpend: 30000,
    tagsInclude: ['vip'],
  };
  await prisma.segment.create({
    data: {
      name: 'VIP Clients',
      description: 'Customers with VIP tag and total spend above ₹30,000.',
      rulesJson: JSON.stringify(rulesVip),
      naturalLanguageQuery: 'VIP tag customers with total spend over 30000',
      createdBy: 'manual',
    },
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
