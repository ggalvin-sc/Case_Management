// Simulate the requireAuth call without await
console.log('Testing requireAuth without await issue...\n');

async function requireAuth(req, res) {
    // Simulate async verification
    await new Promise(resolve => setTimeout(resolve, 1));
    return { id: 1, email: 'admin@example.com', role: 'admin' };
}

// BAD: Without await (like in the code)
async function testWithoutAwait() {
    console.log('1. Testing WITHOUT await:');
    const user = requireAuth({}, {}); // MISSING AWAIT!
    console.log('  typeof user:', typeof user);
    console.log('  user:', user);
    console.log('  user is Promise:', user instanceof Promise);

    if (!user) {
        console.log('  Result: !user is FALSE (won\'t execute error path)');
    }

    if (user.role !== 'admin') {
        console.log('  Result: user.role !== \'admin\' throws error');
    } else {
        console.log('  Result: Accessing user.role will fail!');
    }
}

// GOOD: With await
async function testWithAwait() {
    console.log('\n2. Testing WITH await (correct):');
    const user = await requireAuth({}, {});
    console.log('  typeof user:', typeof user);
    console.log('  user:', user);
    console.log('  user.role:', user.role);

    if (user.role !== 'admin') {
        console.log('  Result: Access denied');
    } else {
        console.log('  Result: Access granted!');
    }
}

(async () => {
    await testWithoutAwait();
    await testWithAwait();
})();
