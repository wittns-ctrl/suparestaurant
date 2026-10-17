// Customer workflow integration test
const BASE_URL = 'http://localhost:3000';

async function testCustomerWorkflow() {
  console.log('=== STARTING CUSTOMER WORKFLOW EVALUATION ===');
  
  // 1. LOGIN
  console.log('\n--- 1. Testing Login ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mugishawitness10@gmail.com', password: 'Manutd@123' }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error('Login failed:', loginData);
    return;
  }
  console.log('Login successful! User ID:', loginData.user.id || loginData.user._id);
  const token = loginData.accessToken;
  const userId = loginData.user.id || loginData.user._id;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. USER PROFILE & DASHBOARD STATS
  console.log('\n--- 2. Testing User Profile & Dashboard Stats ---');
  const profileRes = await fetch(`${BASE_URL}/users/${userId}`, { headers });
  console.log('GET /users/:id status:', profileRes.status, await profileRes.json());

  const statsRes = await fetch(`${BASE_URL}/users/${userId}/dashboard-stats`, { headers });
  console.log('GET /users/:id/dashboard-stats status:', statsRes.status, await statsRes.json());

  // 3. RESTAURANTS
  console.log('\n--- 3. Testing Restaurants List & Details ---');
  const restsRes = await fetch(`${BASE_URL}/restaurants`);
  const rests = await restsRes.json();
  console.log('GET /restaurants status:', restsRes.status, 'Count:', Array.isArray(rests) ? rests.length : rests?.data?.length);
  const restList = Array.isArray(rests) ? rests : (rests?.data || []);
  let testRestaurant = restList[0];
  if (testRestaurant) {
    console.log('Sample Restaurant ID:', testRestaurant._id || testRestaurant.id, 'Name:', testRestaurant.name);
    const restDetailRes = await fetch(`${BASE_URL}/restaurants/${testRestaurant._id || testRestaurant.id}`);
    console.log('GET /restaurants/:id status:', restDetailRes.status);
  } else {
    console.warn('No restaurants found in database!');
  }

  // 4. MENUS
  console.log('\n--- 4. Testing Menus ---');
  let testMenuItem = null;
  if (testRestaurant) {
    const menusRes = await fetch(`${BASE_URL}/menus?restaurantId=${testRestaurant._id || testRestaurant.id}`);
    const menus = await menusRes.json();
    console.log('GET /menus?restaurantId=... status:', menusRes.status, 'Count:', Array.isArray(menus) ? menus.length : menus?.data?.length);
    const menuList = Array.isArray(menus) ? menus : (menus?.data || []);
    if (menuList.length > 0) {
      testMenuItem = menuList[0];
      console.log('Sample Menu Item:', testMenuItem.name, 'Price:', testMenuItem.price, 'ID:', testMenuItem._id || testMenuItem.id);
    }
  }

  // 5. FAVORITES
  console.log('\n--- 5. Testing Favorites ---');
  const favsRes = await fetch(`${BASE_URL}/users/${userId}/favorites`, { headers });
  console.log('GET /users/:id/favorites status:', favsRes.status, await favsRes.json());
  if (testRestaurant) {
    const addFavRes = await fetch(`${BASE_URL}/users/${userId}/favorites/${testRestaurant._id || testRestaurant.id}`, {
      method: 'POST',
      headers
    });
    console.log('POST add favorite status:', addFavRes.status, await addFavRes.json());
  }

  // 6. REVIEWS
  console.log('\n--- 6. Testing Reviews ---');
  if (testRestaurant) {
    const reviewsRes = await fetch(`${BASE_URL}/reviews?restaurantId=${testRestaurant._id || testRestaurant.id}`);
    console.log('GET /reviews status:', reviewsRes.status, await reviewsRes.json());
    const createReviewRes = await fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        restaurantId: testRestaurant._id || testRestaurant.id,
        rating: 5,
        comment: 'Amazing food and great service!'
      })
    });
    console.log('POST /reviews status:', createReviewRes.status, await createReviewRes.json());
  }

  // 7. NOTIFICATIONS
  console.log('\n--- 7. Testing Notifications ---');
  const notifsRes = await fetch(`${BASE_URL}/notifications?userId=${userId}`, { headers });
  console.log('GET /notifications status:', notifsRes.status, await notifsRes.json());

  // 8. BOOKINGS / RESERVATIONS
  console.log('\n--- 8. Testing Bookings ---');
  const myBookingsRes = await fetch(`${BASE_URL}/bookings`, { headers });
  console.log('GET /bookings status:', myBookingsRes.status, await myBookingsRes.json());
  if (testRestaurant) {
    const bookingPayload = {
      restaurantId: testRestaurant._id || testRestaurant.id,
      bookingDate: '2026-10-15',
      bookingTime: '19:00',
      guests: 2,
      specialRequest: 'Window seat please'
    };
    const createBookingRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bookingPayload)
    });
    const createdBooking = await createBookingRes.json();
    console.log('POST /bookings status:', createBookingRes.status, createdBooking);

    if (createdBooking?.id || createdBooking?._id) {
      const bookingId = createdBooking.id || createdBooking._id;
      // Test modifying booking
      const patchBookingRes = await fetch(`${BASE_URL}/bookings/${bookingId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          bookingTime: '20:00',
          guests: 3,
          specialRequest: 'Corner booth please'
        })
      });
      console.log('PATCH /bookings/:id status:', patchBookingRes.status, await patchBookingRes.json());
    }
  }

  // 9. ORDERS
  console.log('\n--- 9. Testing Orders ---');
  const myOrdersRes = await fetch(`${BASE_URL}/orders`, { headers });
  const myOrdersData = await myOrdersRes.json();
  console.log('GET /orders status:', myOrdersRes.status, 'Count:', Array.isArray(myOrdersData) ? myOrdersData.length : myOrdersData?.data?.length);

  if (testRestaurant && testMenuItem) {
    const orderPayload = {
      restaurantId: testRestaurant._id || testRestaurant.id,
      items: [
        {
          menuItemId: testMenuItem._id || testMenuItem.id,
          qty: 2
        }
      ],
      deliveryAddress: {
        street: '42 Evaluation Lane, Kigali',
        city: 'Kigali',
        instructions: 'Call upon arrival'
      },
      timeSlot: 'ASAP'
    };
    const createOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderPayload)
    });
    const createdOrder = await createOrderRes.json();
    console.log('POST /orders status:', createOrderRes.status, createdOrder);

    if (createdOrder._id || createdOrder.id) {
      const orderId = createdOrder._id || createdOrder.id;
      const getOrderRes = await fetch(`${BASE_URL}/orders/${orderId}`, { headers });
      console.log('GET /orders/:id status:', getOrderRes.status);
      const trackingRes = await fetch(`${BASE_URL}/orders/${orderId}/tracking`, { headers });
      console.log('GET /orders/:id/tracking status:', trackingRes.status, await trackingRes.json());
    }
  }

  console.log('\n=== FINISHED CUSTOMER WORKFLOW EVALUATION ===');
}

testCustomerWorkflow().catch(console.error);
