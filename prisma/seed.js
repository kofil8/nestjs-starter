import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            password: adminPassword,
            role: Role.SUPER_ADMIN,
        },
    });
    console.log(`✅ Admin user created: ${admin.email}`);
    const userPassword = await bcrypt.hash('User@123', 10);
    const user1 = await prisma.user.upsert({
        where: { email: 'alice@example.com' },
        update: {},
        create: {
            email: 'alice@example.com',
            firstName: 'Alice',
            lastName: 'Johnson',
            password: userPassword,
            role: Role.USER,
        },
    });
    const user2 = await prisma.user.upsert({
        where: { email: 'bob@example.com' },
        update: {},
        create: {
            email: 'bob@example.com',
            firstName: 'Bob',
            lastName: 'Smith',
            password: userPassword,
            role: Role.USER,
        },
    });
    console.log(`✅ Users created: ${user1.email}, ${user2.email}`);
    const posts = [
        { title: 'Getting Started with NestJS', content: 'NestJS is a progressive Node.js framework...', authorId: user1.id },
        { title: 'Prisma ORM Best Practices', content: 'Prisma provides a type-safe database client...', authorId: user1.id },
        { title: 'JWT Authentication Guide', content: 'Learn how to implement JWT auth in NestJS...', authorId: user2.id },
    ];
    for (const post of posts) {
        await prisma.post.create({ data: post });
    }
    console.log(`✅ ${posts.length} sample posts created`);
    console.log('🎉 Seeding complete!');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map