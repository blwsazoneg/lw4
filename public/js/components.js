// public/js/components.js

document.addEventListener("alpine:init", () => {
  Alpine.data("placementIntroPage", () => ({
    showText: false,
    isExiting: false,
    line1: "Discover strategic",
    line2: "company placement",
    init() {
      setTimeout(() => {
        this.showText = true;
      }, 500);
      setTimeout(() => {
        this.startExit();
      }, 6000);
    },
    startExit() {
      this.isExiting = true;
      setTimeout(() => {
        window.location.href = "/innovate-intro";
      }, 1000);
    },
  }));

  Alpine.data("landingPage", () => ({
    showText: false,
    isExiting: false,
    init() {
      setTimeout(() => {
        this.showText = true;
      }, 1000);
      setTimeout(() => {
        this.startExit();
      }, 6000);
    },
    startExit() {
      this.isExiting = true;
      setTimeout(() => {
        window.location.href = "/explore";
      }, 1000);
    },
  }));

  Alpine.data("innovateIntroPage", () => ({
    showText: false,
    isExiting: false,
    // THE NEW TEXT CONTENT
    line1: "Bring Innovations to",
    line2: "Life",
    init() {
      setTimeout(() => {
        this.showText = true;
      }, 500);
      setTimeout(() => {
        this.startExit();
      }, 6000);
      // This is the final intro page, so no automatic exit.
    },
    startExit() {
      this.isExiting = true;
      setTimeout(() => {
        window.location.href = "/home-main";
      }, 1000);
    },
    // The startExit function is not needed for now.
  }));

  Alpine.data("cinema", () => ({
    isVideoPlaying: true,
    init() {
      // Safety timeout
      setTimeout(() => {
        if (this.isVideoPlaying) this.goToLandingPage();
      }, 15000);
    },
    videoEnded() {
      this.isVideoPlaying = false;
      this.goToLandingPage();
    },
    goToLandingPage() {
      document.body.style.transition = "opacity 0.5s ease-in-out";
      document.body.style.opacity = 0;
      setTimeout(() => {
        window.location.href = "/landing";
      }, 500);
    },
  }));

  Alpine.data("explorePage", () => ({
    showText: false,
    isExiting: false,
    line1: "Explore the",
    line2: "Loveworld Economy",
    init() {
      setTimeout(() => {
        this.showText = true;
      }, 500);
      setTimeout(() => {
        this.startExit();
      }, 6000);
    },
    startExit() {
      this.isExiting = true;
      setTimeout(() => {
        window.location.href = "/shop-intro";
      }, 1000);
    },
  }));

  Alpine.data("shopIntroPage", () => ({
    showText: false,
    isExiting: false,
    line1: "Shop made in",
    line2: "Loveworld",
    init() {
      setTimeout(() => {
        this.showText = true;
      }, 500);
      setTimeout(() => {
        this.startExit();
      }, 6000);
    },
    startExit() {
      this.isExiting = true;
      setTimeout(() => {
        window.location.href = "/placement-intro";
      }, 1000);
    },
  }));

  Alpine.store("notifications", {
    title: "",
    message: "",
    onCloseCallback: null,
    modalInstance: null, // To hold the Bootstrap modal instance

    init() {
      // Find the modal element on the page
      const modalEl = document.getElementById("notificationModal");
      if (modalEl) {
        // Create a new Bootstrap Modal instance
        this.modalInstance = new bootstrap.Modal(modalEl);

        // Listen for the Bootstrap 'hidden' event
        modalEl.addEventListener("hidden.bs.modal", () => {
          // When the modal is fully hidden, run our callback
          if (this.onCloseCallback) {
            this.onCloseCallback();
          }
        });
      }
    },

    show(title, message, onClose = null) {
      if (!this.modalInstance) {
        // Fallback if the modal couldn't be initialized
        alert(`${title}\n\n${message}`);
        if (onClose) onClose();
        return;
      }
      this.title = title;
      this.message = message;
      this.onCloseCallback = onClose;

      // Use the Bootstrap API to show the modal
      this.modalInstance.show();
    },
  });
  Alpine.store("notifications").init();
  Alpine.store("cart", {
    count: 0,
    fetchCount() {
      if (window.APP_DATA && window.APP_DATA.user) {
        axios
          .get("/api/cart")
          .then((response) => {
            this.count = response.data.items.length;
          })
          .catch(() => {
            this.count = 0;
          });
      }
    },
  });
  Alpine.store("toast", {
    isVisible: false,
    message: "",
    timer: null,
    show(message) {
      if (this.timer) clearTimeout(this.timer);
      this.message = message;
      this.isVisible = true;
      this.timer = setTimeout(() => {
        this.isVisible = false;
      }, 3000);
    },
    close() {
      if (this.timer) clearTimeout(this.timer);
      this.isVisible = false;
    },
  });

  // --- GLOBAL COMPONENTS ---
  Alpine.data("notificationModal", () => ({
    get isOpen() {
      return Alpine.store("notifications").isOpen;
    },
    get title() {
      return Alpine.store("notifications").title;
    },
    get message() {
      return Alpine.store("notifications").message;
    },
    close() {
      Alpine.store("notifications").close();
    },
  }));
  Alpine.data("toast", () => ({
    get isVisible() {
      return Alpine.store("toast").isVisible;
    },
    get message() {
      return Alpine.store("toast").message;
    },
    close() {
      Alpine.store("toast").close();
    },
  }));

  // --- PAGE-SPECIFIC COMPONENTS ---
  Alpine.data("shoppingCart", () => ({
    items: [],
    isLoading: true,
    error: null,
    isCheckingOut: false,
    stripe: null,
    elements: null,
    clientSecret: null,
    init() {
      const waitForStripe = () => {
        if (window.Stripe) {
          try {
            this.stripe = Stripe(window.APP_DATA.STRIPE_PUBLISHABLE_KEY);
            this.fetchCartItems();
          } catch (e) {
            this.error = "Stripe failed to initialize.";
            this.isLoading = false;
            console.error("Stripe init error:", e);
          }
        } else {
          setTimeout(waitForStripe, 100);
        }
      };
      waitForStripe();
    },
    fetchCartItems() {
      this.isLoading = true;
      axios
        .get("/api/cart")
        .then((response) => {
          this.items = response.data.items;
          if (this.items.length > 0) {
            this.initializeStripeElements();
          } else {
            this.isLoading = false;
          }
        })
        .catch((error) => {
          this.error = "Could not load your cart.";
          this.isLoading = false;
        });
    },
    async initializeStripeElements() {
      try {
        const response = await axios.post("/api/orders/create-payment-intent");
        this.clientSecret = response.data.clientSecret;
        this.elements = this.stripe.elements({
          clientSecret: this.clientSecret,
        });
        const paymentElement = this.elements.create("payment");
        paymentElement.mount("#payment-element");
        this.isLoading = false;
      } catch (error) {
        this.error = "Could not initialize payment.";
        this.isLoading = false;
      }
    },
    async checkout() {
      if (this.isCheckingOut || !this.stripe || !this.elements) return;
      this.isCheckingOut = true;
      const { error: stripeError } = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-complete`,
        },
        redirect: "if_required",
      });
      if (stripeError) {
        Alpine.store("notifications").show(
          "Payment Failed",
          stripeError.message
        );
        this.isCheckingOut = false;
        return;
      }
      try {
        const finalizeResponse = await axios.post("/api/orders/finalize");
        Alpine.store("notifications").show(
          "Payment Successful!",
          `Your order #${finalizeResponse.data.orderId} has been placed.`,
          () => {
            this.items = [];
            Alpine.store("cart").fetchCount();
          }
        );
      } catch (dbError) {
        Alpine.store("notifications").show(
          "Order Error",
          "Payment successful, but order creation failed. Please contact support."
        );
      } finally {
        this.isCheckingOut = false;
      }
    },
    removeItem(productId) {
      const originalItems = [...this.items];
      this.items = this.items.filter((item) => item.product_id !== productId);
      axios
        .delete(`/api/cart/items/${productId}`)
        .then(() => {
          Alpine.store("cart").fetchCount();
          Alpine.store("toast").show("Item removed from cart.");
          if (this.items.length === 0) {
            window.location.reload();
          }
        })
        .catch(() => {
          this.items = originalItems;
          Alpine.store("notifications").show("Error", "Could not remove item.");
        });
    },
    formatCurrency(price) {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }).format(price);
    },
    get subtotal() {
      return this.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );
    },
  }));

  Alpine.store("auth", {
    login(redirectUrl = window.location.pathname) {
      if (typeof kingsChatWebSdk === "undefined") {
        alert("Error: KingsChat SDK is not available.");
        return;
      }
      const KINGSCHAT_CLIENT_ID = "b2b522e9-d602-402d-b61d-8a50825862da";
      const loginOptions = {
        clientId: KINGSCHAT_CLIENT_ID,
        scopes: ["profile"],
      };

      kingsChatWebSdk
        .login(loginOptions)
        .then((response) => {
          if (!response || !response.accessToken) {
            throw new Error("SDK did not return an accessToken.");
          }
          return axios.post("/api/auth/kingschat/verify", {
            accessToken: response.accessToken,
          });
        })
        .then((serverResponse) => {
          alert(`Welcome, ${serverResponse.data.user.firstName}!`);
          // If a specific redirect was requested (like for employer registration), use it.
          // Otherwise, just reload the current page.
          if (redirectUrl && redirectUrl !== window.location.pathname) {
            window.location.href = redirectUrl;
          } else {
            window.location.reload();
          }
        })
        .catch((error) => {
          console.error("An error occurred during the login process:", error);
          alert("Login failed. Please check the console for details.");
        });
    },
  });

  Alpine.data("shop", () => ({
    // STATE
    allProducts: [],
    brands: [],
    cartItems: [],
    isLoading: true,
    isAddingToCart: null,

    filters: {
      searchQuery: "",
      selectedBrands: [], // This will hold the IDs of checked brands
      minPrice: "",
      maxPrice: "",
      sortBy: "created_at_desc",
    },

    // Pagination State
    currentPage: 1,
    itemsPerPage: 12,

    // METHODS
    init() {
      this.loadInitialData();
      // THE FIX: The watcher was correct, but we ensure data is loaded first.
      this.$watch("filters", () => {
        this.currentPage = 1; // Reset to page 1 on any filter change
        // The filtering is now client-side, so we don't need to call the API again.
      });
    },

    async loadInitialData() {
      this.isLoading = true;
      try {
        const [productsRes, brandsRes, cartRes] = await Promise.all([
          axios.get("/api/products"),
          axios.get("/api/brands"),
          window.APP_DATA.user
            ? axios.get("/api/cart")
            : Promise.resolve({ data: { items: [] } }),
        ]);
        this.allProducts = productsRes.data;
        this.brands = brandsRes.data;
        this.cartItems = cartRes.data.items;
        Alpine.store("cart").count = this.cartItems.length;
      } catch (e) {
        console.error("Failed to load shop data", e);
      } finally {
        this.isLoading = false;
      }
    },

    // COMPUTED PROPERTIES (Client-side filtering is more reliable here)
    get filteredAndSortedProducts() {
      let filtered = [...this.allProducts];

      // Apply search query
      if (this.filters.searchQuery) {
        const search = this.filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.brand_name.toLowerCase().includes(search)
        );
      }
      // THE FIX: Correctly filter by the array of selected brand IDs.
      if (this.filters.selectedBrands.length > 0) {
        // Ensure we compare numbers to numbers
        const selectedIds = this.filters.selectedBrands.map((id) => Number(id));
        filtered = filtered.filter((p) => selectedIds.includes(p.brand_id));
      }
      if (this.filters.minPrice) {
        filtered = filtered.filter((p) => p.price >= this.filters.minPrice);
      }
      if (this.filters.maxPrice) {
        filtered = filtered.filter((p) => p.price <= this.filters.maxPrice);
      }

      // Apply sorting
      switch (this.filters.sortBy) {
        case "price_asc":
          filtered.sort((a, b) => a.price - b.price);
          break;
        case "price_desc":
          filtered.sort((a, b) => b.price - a.price);
          break;
        case "name_asc":
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        default:
          filtered.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          break;
      }

      return filtered;
    },

    get paginatedProducts() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredAndSortedProducts.slice(start, end);
    },

    get totalPages() {
      return Math.ceil(
        this.filteredAndSortedProducts.length / this.itemsPerPage
      );
    },

    // Pagination Methods
    changePage(newPage) {
      if (newPage > 0 && newPage <= this.totalPages) {
        this.currentPage = newPage;
        window.scrollTo(0, 0); // Scroll to top on page change
      }
    },

    // --- All other helper methods are correct ---
    fetchCart() {
      if (window.APP_DATA.user) {
        return axios.get("/api/cart").then((response) => {
          this.cartItems = response.data.items;
          Alpine.store("cart").count = this.cartItems.length;
        });
      }
      return Promise.resolve();
    },
    getCartItem(productId) {
      return this.cartItems.find((item) => item.product_id === productId);
    },
    addToCart(productId) {
      if (!window.APP_DATA.user) {
        alert("Please log in to add items to your cart.");
        Alpine.store("auth").login();
        return;
      }
      this.isAddingToCart = productId;
      axios
        .post("/api/cart/items", { productId: productId, quantity: 1 })
        .then(() => {
          this.fetchCart();
        })
        .catch((error) => {
          Alpine.store("notifications").show(
            "Error",
            "Could not add item to cart."
          );
        })
        .finally(() => {
          this.isAddingToCart = null;
        });
    },
    updateQuantity(productId, change) {
      const item = this.getCartItem(productId);
      if (!item) return;
      const newQuantity = item.quantity + change;
      if (newQuantity <= 0) {
        axios
          .delete(`/api/cart/items/${productId}`)
          .then(() => this.fetchCart());
      } else {
        axios
          .put(`/api/cart/items/${productId}`, { quantity: newQuantity })
          .then(() => this.fetchCart());
      }
    },
    formatCurrency(price) {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }).format(price);
    },
  }));

  Alpine.data("productDetail", (productId) => ({
    // STATE
    productId: productId,
    product: null, // Will hold the single product object
    cartItems: [],
    isLoading: true,
    error: null,
    isAddingToCart: false,

    // METHODS
    init() {
      this.fetchProduct();
      if (window.APP_DATA.user) {
        this.fetchCart();
      }
    },

    fetchProduct() {
      this.isLoading = true;
      axios
        .get(`/api/products/${this.productId}`)
        .then((response) => {
          this.product = response.data;
          // Dynamically update the page's <title>
          document.title = this.product.name;
        })
        .catch((error) => {
          console.error("Error fetching product:", error);
          if (error.response && error.response.status === 404) {
            this.error = "This product could not be found.";
          } else {
            this.error = "Could not load product details.";
          }
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    fetchCart() {
      axios.get("/api/cart").then((response) => {
        this.cartItems = response.data.items;
        Alpine.store("cart").count = this.cartItems.length;
      });
    },

    getCartItem(id) {
      return this.cartItems.find((item) => item.product_id === id);
    },

    addToCart(id) {
      if (!window.APP_DATA.user) {
        alert("Please log in to add items to your cart.");
        document.querySelector(".kc-web-sdk-btn-s")?.click();
        return;
      }
      this.isAddingToCart = true;
      axios
        .post("/api/cart/items", { productId: id, quantity: 1 })
        .then(() => {
          this.fetchCart();
        }) // Refresh cart state on success
        .catch(() => {
          Alpine.store("notifications").show(
            "Error",
            "Could not add item to cart."
          );
        })
        .finally(() => {
          this.isAddingToCart = false;
        });
    },

    updateQuantity(productId, change) {
      const item = this.getCartItem(productId);
      if (!item) return;

      const newQuantity = item.quantity + change;

      if (newQuantity <= 0) {
        // If quantity drops to 0, call the DELETE endpoint
        axios.delete(`/api/cart/items/${productId}`).then((response) => {
          // Always refetch the entire cart to ensure consistency
          this.fetchCart();
        });
      } else {
        // If quantity is > 0, call the new "set quantity" endpoint
        // We will create this PUT endpoint next. It's more reliable.
        axios
          .put(`/api/cart/items/${productId}`, { quantity: newQuantity })
          .then((response) => {
            // Always refetch the entire cart
            this.fetchCart();
          });
      }
    },

    formatCurrency(price) {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }).format(price);
    },
  }));

  Alpine.data("kingsChatLogin", () => ({
    // We no longer need the redirectUrl or setRedirect properties.

    handleLogin() {
      if (typeof kingsChatWebSdk === "undefined" || !kingsChatWebSdk) {
        alert("Error: KingsChat SDK is not available.");
        return;
      }

      // IMPORTANT: Make sure this is your correct Client ID
      const KINGSCHAT_CLIENT_ID = "b2b522e9-d602-402d-b61d-8a50825862da";
      const loginOptions = {
        clientId: KINGSCHAT_CLIENT_ID,
        scopes: ["profile"],
      };

      kingsChatWebSdk
        .login(loginOptions)
        .then((response) => {
          const { accessToken } = response;
          if (!accessToken) {
            throw new Error("SDK did not return an accessToken.");
          }
          return axios.post("/api/auth/kingschat/verify", {
            accessToken: accessToken,
          });
        })
        .then((serverResponse) => {
          console.log("Backend Response:", serverResponse.data);
          alert(`Welcome, ${serverResponse.data.user.firstName}!`);

          // --- THE PERMANENT FIX ---
          // Simply reload the current page. The server will now have the
          // user's session and will render the page in a "logged-in" state.
          window.location.reload();
        })
        .catch((error) => {
          console.error("An error occurred during the login process:", error);
          alert("Login failed. Please check the console for details.");
        });
    },
  }));

  Alpine.data("profileCreator", (user) => ({
    // STATE
    user: user,
    isLoggedIn: user && user.id,
    profileExists: false, // NEW: Track if a profile was loaded
    formData: {
      headline: "",
      bio: "",
      skills: [],
      portfolio_url: "",
      linkedin_url: "",
      age: "",
      field_of_study: "",
      zone: "",
      church: "",
      ministry_position: "",
      appointment_year: "",
    },
    skillsInput: "",
    isSaving: false,

    // COMPUTED PROPERTIES (these automatically update)
    get pageTitle() {
      return this.profileExists
        ? "Edit Your Professional Profile"
        : "Create Your Professional Profile";
    },
    get submitButtonText() {
      return this.profileExists ? "Update Profile" : "Create My Profile";
    },

    // METHODS
    init() {
      if (this.isLoggedIn) {
        axios.get("/api/profile/me").then((response) => {
          if (response.data) {
            this.profileExists = true; // A profile was found!
            this.formData = { ...this.formData, ...response.data };
            this.skillsInput = this.formData.skills
              ? this.formData.skills.join(", ")
              : "";
          }
        });
      }
    },
    saveProfile() {
      this.isSaving = true;
      this.formData.skills = this.skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      axios
        .post("/api/profile", this.formData)
        .then((response) => {
          this.profileExists = true; // After saving, a profile now exists
          Alpine.store("notifications").show(
            "Profile Saved!",
            "Your profile has been successfully saved."
          );
        })
        .catch((error) => {
          Alpine.store("notifications").show(
            "Error",
            "There was a problem saving your profile. Please try again."
          );
        })
        .finally(() => {
          this.isSaving = false;
        });
    },
  }));

  Alpine.data("profileEditor", () => ({
    // STATE
    formData: {
      headline: "",
      bio: "",
      skills: [],
      portfolio_url: "",
      linkedin_url: "",
    },
    skillsInput: "", // A separate model for the comma-separated skills input
    isLoading: true,
    isSaving: false,
    message: "",
    isError: false,

    // METHODS
    loadProfile() {
      this.isLoading = true;
      axios
        .get("/api/profile/me")
        .then((response) => {
          // If the user has an existing profile, populate the form
          if (response.data) {
            this.formData = response.data;
            // Convert the skills array back into a comma-separated string for the input field
            this.skillsInput = response.data.skills
              ? response.data.skills.join(", ")
              : "";
          }
        })
        .catch((error) => {
          console.error("Error loading profile:", error);
          this.message = "Could not load your profile.";
          this.isError = true;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    saveProfile() {
      this.isSaving = true;
      this.message = "";
      this.isError = false;

      // Convert the comma-separated string from the input into an array for the backend.
      this.formData.skills = this.skillsInput
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill);

      axios
        .post("/api/profile", this.formData)
        .then((response) => {
          this.message = "Profile saved successfully!";
          // Optionally, update formData with the returned profile to get the latest updated_at, etc.
          this.formData = response.data.profile;
        })
        .catch((error) => {
          console.error("Error saving profile:", error);
          this.message = "There was an error saving your profile.";
          this.isError = true;
        })
        .finally(() => {
          this.isSaving = false;
          // Hide the message after a few seconds
          setTimeout(() => {
            this.message = "";
          }, 3000);
        });
    },
  }));

  Alpine.data("jobBoard", (user) => ({
    // STATE
    user: user,
    isLoggedIn: user && user.id,
    jobs: [],
    isLoading: true,
    searchQuery: "", // The single search query

    init() {
      this.fetchJobs();
      // Watch for changes in the search query and refetch
      this.$watch("searchQuery", () => this.fetchJobs());
    },

    fetchJobs() {
      this.isLoading = true;
      const params = new URLSearchParams();
      if (this.searchQuery) {
        params.append("searchQuery", this.searchQuery);
      }
      axios
        .get(`/api/jobs?${params.toString()}`)
        .then((response) => {
          this.jobs = response.data;
        })
        .catch((error) => console.error("Error fetching jobs:", error))
        .finally(() => {
          this.isLoading = false;
        });
    },

    // NEW METHOD: Handles the "View & Apply" button click
    handleViewAndApply(jobId) {
      if (this.isLoggedIn) {
        // If logged in, proceed to the job details page
        window.location.href = `/jobs/${jobId}`;
      } else {
        // If not logged in, prompt and trigger the login process
        alert("Please log in to view and apply for jobs.");
        // We can find the login button in the navbar and simulate a click
        // This reuses our existing kingsChatLogin component perfectly.
        document.querySelector(".kc-web-sdk-btn-s")?.click();
      }
    },

    // COMPUTED PROPERTY (with the 'includes' fix)
    // get filteredJobs() {
    //   let filtered = this.jobs;
    //   if (this.searchQuery) {
    //     const searchLower = this.searchQuery.toLowerCase();
    //     filtered = filtered.filter(
    //       (job) =>
    //         job.title.toLowerCase().includes(searchLower) ||
    //         job.company_name.toLowerCase().includes(searchLower)
    //     );
    //   }
    //   if (this.tagQuery) {
    //     const tagLower = this.tagQuery.toLowerCase();
    //     filtered = filtered.filter((job) =>
    //       job.tags.some((tag) => tag.toLowerCase().includes(tagLower))
    //     );
    //   }
    //   return filtered;
    // },
  }));

  Alpine.data("jobDetail", (jobId, user) => ({
    // STATE
    jobId: jobId, // This is passed in as a number from the EJS template
    user: user,
    isLoggedIn: user && user.id,
    job: null,
    isLoading: true,
    error: null,
    isApplying: false,
    hasApplied: false,

    // METHODS
    init() {
      this.fetchJob();
    },

    fetchJob() {
      this.isLoading = true;
      axios
        .get(`/api/jobs/${this.jobId}`)
        .then((response) => {
          this.job = response.data;

          // THE FIX: Use the correct property 'title'
          if (this.job && this.job.title) {
            document.title = this.job.title;
          }

          if (this.isLoggedIn) {
            this.checkApplicationStatus();
          }
        })
        .catch((error) => {
          console.error("Error fetching job details:", error);
          if (error.response && error.response.status === 404) {
            this.error = "Sorry, this job could not be found.";
          } else {
            this.error = "An error occurred while loading the job details.";
          }
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    checkApplicationStatus() {
      axios.get(`/api/applications/user/${this.user.id}`).then((response) => {
        const applications = response.data;

        // THE FIX: Ensure a strict number-to-number comparison
        if (
          applications.some((app) => Number(app.job_id) === Number(this.jobId))
        ) {
          this.hasApplied = true;
        }
      });
    },

    handleApply() {
      if (!this.isLoggedIn || this.hasApplied || this.isApplying) {
        return;
      }

      this.isApplying = true;
      axios
        .post("/api/applications", { job_id: this.jobId })
        .then((response) => {
          this.hasApplied = true;
          Alpine.store("notifications").show(
            "Application Sent!",
            "Your application has been successfully submitted. The employer can now view your profile."
          );
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message || "An error occurred.";
          Alpine.store("notifications").show("Application Error", errorMessage);
        })
        .finally(() => {
          this.isApplying = false;
        });
    },
  }));

  // ...existing code...
  Alpine.data("productList", () => ({
    // STATE
    products: [],
    isLoading: true,
    pagination: { currentPage: 1, totalPages: 1, totalProducts: 0 },
    currentPage: 1,

    // METHODS
    init() {
      this.fetchProducts(this.currentPage);
    },

    fetchProducts(page) {
      this.isLoading = true;
      axios
        .get(`/api/products?page=${page}`)
        .then((response) => {
          const res = response.data;

          // Support several response shapes:
          // 1) Array of products
          // 2) { products: [...], pagination: {...} }
          // 3) { data: [...] } (less common)
          if (Array.isArray(res)) {
            this.products = res;
            this.pagination = {
              currentPage: page,
              totalPages: 1,
              totalProducts: res.length,
            };
          } else if (res && res.products) {
            this.products = res.products;
            this.pagination = res.pagination || {
              currentPage: page,
              totalPages: 1,
              totalProducts: this.products.length,
            };
          } else if (res && Array.isArray(res.data)) {
            this.products = res.data;
            this.pagination = {
              currentPage: page,
              totalPages: Math.max(
                1,
                Math.ceil(this.products.length / this.itemsPerPage)
              ),
              totalProducts: this.products.length,
            };
          } else {
            console.warn("Unexpected /api/products response shape:", res);
            this.products = [];
            this.pagination = {
              currentPage: page,
              totalPages: 1,
              totalProducts: 0,
            };
          }

          // Normalize id field (support _id from Mongo etc.)
          this.products = this.products.map((p) => ({
            ...p,
            id: p.id || p._id || p.product_id,
          }));

          // Ensure currentPage reflects pagination
          this.currentPage = this.pagination.currentPage || page;
        })
        .catch((error) => {
          console.error("Error fetching products:", error);
          this.products = [];
          this.pagination = { currentPage: 1, totalPages: 1, totalProducts: 0 };
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    changePage(newPage) {
      const last =
        this.pagination && this.pagination.totalPages
          ? this.pagination.totalPages
          : 1;
      if (newPage > 0 && newPage <= last) {
        this.currentPage = newPage;
        this.fetchProducts(this.currentPage);
      }
    },

    confirmDelete(id, name) {
      if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
        axios
          .delete(`/api/products/${id}`)
          .then(() => {
            Alpine.store("toast").show("Product deleted successfully.");
            if (this.products.length === 1 && this.currentPage > 1) {
              this.changePage(this.currentPage - 1);
            } else {
              this.fetchProducts(this.currentPage);
            }
          })
          .catch((error) => {
            const message =
              error.response?.data?.message || "Failed to delete product.";
            Alpine.store("notifications").show("Deletion Error", message);
          });
      }
    },

    formatCurrency(price) {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }).format(price);
    },
  }));
  // ...existing code...

  Alpine.data("productEditor", (productId) => ({
    // STATE
    productId: productId,
    product: {},
    brands: [],
    sectors: [],
    isLoading: true,
    isSaving: false,
    error: null,

    // --- NEW: Modal State ---
    isModalOpen: false,
    modalType: "",
    newItemName: "",

    // METHODS
    init() {
      Promise.all([
        axios.get(`/api/products/${this.productId}`),
        axios.get("/api/brands"),
        axios.get("/api/sectors"),
      ])
        .then(([productRes, brandsRes, sectorsRes]) => {
          this.product = productRes.data;
          this.brands = brandsRes.data;
          this.sectors = sectorsRes.data;
        })
        .catch((err) => {
          this.error = "Failed to load necessary data.";
          console.error(err);
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    saveChanges() {
      this.isSaving = true;
      axios
        .put(`/api/products/${this.productId}`, this.product)
        .then((response) => {
          Alpine.store("toast").show("Product updated successfully!");
          setTimeout(() => {
            window.location.href = "/admin/products";
          }, 1500);
        })
        .catch((error) => {
          const message =
            error.response?.data?.message || "Failed to update product.";
          Alpine.store("notifications").show("Update Error", message);
        })
        .finally(() => {
          this.isSaving = false;
        });
    },

    // --- NEW: Modal Methods (Identical to productCreator) ---
    openCreationModal(type) {
      this.modalType = type;
      this.newItemName = "";
      this.isModalOpen = true;
      this.$nextTick(() => {
        document.getElementById(`new_${type}_name`).focus();
      });
    },

    closeModal() {
      this.isModalOpen = false;
    },

    handleCreateNewItem() {
      if (!this.newItemName.trim()) return;

      const endpoint =
        this.modalType === "brand" ? "/api/brands" : "/api/sectors";
      const data = { name: this.newItemName };

      axios
        .post(endpoint, data)
        .then((response) => {
          const newItem = response.data;
          if (this.modalType === "brand") {
            this.brands.push(newItem);
            this.product.brand_id = newItem.id;
          } else {
            this.sectors.push(newItem);
            this.product.sector_id = newItem.id;
          }
          Alpine.store("toast").show(
            `${
              this.modalType.charAt(0).toUpperCase() + this.modalType.slice(1)
            } created!`
          );
          this.closeModal();
        })
        .catch((error) => {
          const message =
            error.response?.data?.message ||
            `Failed to create ${this.modalType}.`;
          Alpine.store("notifications").show("Creation Error", message);
        });
    },
  }));

  Alpine.data("orderHistory", () => ({
    // STATE
    orders: [],
    isLoading: true,
    error: null,
    pagination: { currentPage: 1, totalPages: 1, totalOrders: 0 },
    searchQuery: "",
    currentPage: 1,

    // METHODS
    init() {
      this.fetchOrders(this.currentPage, this.searchQuery);
      // Watch for changes in the search query
      this.$watch("searchQuery", () => {
        this.currentPage = 1; // Reset to page 1 on new search
        this.fetchOrders(this.currentPage, this.searchQuery);
      });
    },

    fetchOrders(page, search) {
      this.isLoading = true;
      const params = new URLSearchParams({ page });
      if (search) {
        params.append("searchQuery", search);
      }

      axios
        .get(`/api/orders?${params.toString()}`)
        .then((response) => {
          this.orders = response.data.orders;
          this.pagination = response.data.pagination;
        })
        .catch((error) => {
          console.error("Error fetching order history:", error);
          this.error = "Could not load your order history.";
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    changePage(newPage) {
      if (newPage > 0 && newPage <= this.pagination.totalPages) {
        this.currentPage = newPage;
        this.fetchOrders(this.currentPage, this.searchQuery);
      }
    },

    formatOrderDate(dateString) {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-ZA", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(date);
    },

    formatCurrency(price) {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }).format(price);
    },
  }));

  Alpine.data("orderDetail", (orderId) => ({
    orderId: orderId,
    order: null,
    isLoading: true,
    error: null,

    init() {
      this.fetchOrderDetails();
    },

    fetchOrderDetails() {
      this.isLoading = true;
      // Use the admin API endpoint to get the data
      axios
        .get(`/api/admin/orders/${this.orderId}`)
        .then((response) => {
          this.order = response.data;
          document.title = `Order ${this.order.order_number.substring(
            0,
            8
          )}...`;
        })
        .catch((error) => {
          this.error = "Could not load order details.";
          console.error(error);
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    // --- NEW METHOD ---
    updateStatus(id, newStatus) {
      axios
        .put(`/api/admin/orders/${id}/status`, { status: newStatus })
        .then((response) => {
          // The API was successful, update the local data
          this.order.status = response.data.order.status;
          Alpine.store("toast").show(`Order status updated to "${newStatus}".`);
        })
        .catch((error) => {
          Alpine.store("notifications").show(
            "Update Failed",
            "Could not update the order status."
          );
        });
    },

    formatOrderDate(dateString) {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-ZA", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(date);
    },

    formatCurrency(price) {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }).format(price);
    },
  }));

  Alpine.data("employerRegistration", (user) => ({
    user: user,
    isLoggedIn: user && user.id,
    formData: {
      name: "",
      description: "",
      website: "",
    },
    isSubmitting: false,

    registerCompany() {
      this.isSubmitting = true;
      axios
        .post("/api/employers/register", this.formData)
        .then((response) => {
          Alpine.store("notifications").show(
            "Registration Successful!",
            "Your company profile has been created. You will now be redirected to your dashboard."
          );
          // Redirect to the future employer dashboard
          setTimeout(() => {
            window.location.href = "/employers/dashboard";
          }, 2000);
        })
        .catch((error) => {
          const message =
            error.response?.data?.message ||
            "Registration failed. Please try again.";
          Alpine.store("notifications").show("Registration Error", message);
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    },
  }));

  Alpine.data("employerDashboard", () => ({
    // STATE
    company: null, // Will hold the company object if it exists
    jobs: [],
    isLoading: true,
    isSubmitting: false,
    formData: {
      name: "",
      description: "",
      website: "",
    },

    // METHODS
    init() {
      this.checkCompanyStatus();
    },

    async checkCompanyStatus() {
      this.isLoading = true;
      try {
        const response = await axios.get("/api/employers/my-company");
        this.company = response.data;
        if (this.company) {
          // If a company exists, fetch its jobs
          await this.fetchMyJobs();
        }
      } catch (error) {
        console.error("Error checking company status:", error);
      } finally {
        this.isLoading = false;
      }
    },

    fetchMyJobs() {
      return axios.get("/api/jobs/my-jobs").then((response) => {
        this.jobs = response.data;
      });
    },

    registerCompany() {
      this.isSubmitting = true;
      axios
        .post("/api/employers/register", this.formData)
        .then((response) => {
          Alpine.store("notifications").show(
            "Success!",
            "Your company profile has been created."
          );
          // After creating, re-check the status, which will now show the job list.
          this.checkCompanyStatus();
        })
        .catch((error) => {
          const message =
            error.response?.data?.message || "Registration failed.";
          Alpine.store("notifications").show("Error", message);
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    },

    deleteJob(jobId) {
      if (confirm("Are you sure you want to delete this job posting?")) {
        axios
          .delete(`/api/jobs/${jobId}`)
          .then(() => {
            Alpine.store("toast").show("Job posting deleted.");
            this.fetchMyJobs(); // Refresh the list
          })
          .catch(() => {
            Alpine.store("notifications").show(
              "Error",
              "Could not delete job posting."
            );
          });
      }
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },

    // --- NEW METHOD ---
    updateStatus(jobId, newStatus) {
      const job = this.jobs.find((j) => j.id === jobId);
      if (!job) return;

      axios
        .put(`/api/jobs/${jobId}/status`, { status: newStatus })
        .then((response) => {
          // Update the local data to instantly reflect the change
          job.status = response.data.job.status;
          Alpine.store("toast").show(`Job has been ${newStatus}.`);
        })
        .catch((error) => {
          Alpine.store("notifications").show(
            "Error",
            "Could not update job status."
          );
        });
    },
  }));

  Alpine.data("jobCreator", (user) => ({
    // STATE
    user: user,
    isAdmin: user && user.role === "admin",
    allCompanies: [], // To store the list of companies for the admin dropdown
    formData: {
      title: "",
      description: "",
      location: "",
      tags: "",
      company_id: "", // Admins will set this via the dropdown
    },
    isSubmitting: false,

    // METHODS
    init() {
      // If the user is an admin, fetch the list of all companies to populate the dropdown.
      if (this.isAdmin) {
        axios
          .get("/api/companies") // We need to create this API endpoint
          .then((response) => {
            this.allCompanies = response.data;
          });
      }
    },

    submitJob() {
      this.isSubmitting = true;
      axios
        .post("/api/jobs", this.formData)
        .then((response) => {
          Alpine.store("notifications").show(
            "Job Posted!",
            "Your new job listing is now live."
          );
          setTimeout(() => {
            window.location.href = "/employers/dashboard";
          }, 1500);
        })
        .catch((error) => {
          const message =
            error.response?.data?.message || "Could not post job.";
          Alpine.store("notifications").show("Error", message);
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    },
  }));

  Alpine.data("innovationForm", (user) => ({
    // STATE
    user: user,
    isLoggedIn: user && user.id,
    formData: {
      title: "",
      submission_text: "",
      ministry_position: "",
    },
    isSubmitting: false,

    // METHODS
    submitIdea() {
      // Basic validation
      if (
        !this.formData.title.trim() ||
        !this.formData.submission_text.trim()
      ) {
        Alpine.store("notifications").show(
          "Validation Error",
          "Please provide a title and a description for your idea."
        );
        return;
      }

      this.isSubmitting = true;

      // FormData is a special object required for sending files.
      const data = new FormData();

      // 1. Append all the text fields from our formData object.
      data.append("title", this.formData.title);
      data.append("submission_text", this.formData.submission_text);
      data.append("ministry_position", this.formData.ministry_position);

      // 2. Append any selected files. We use $refs to access the file input elements.
      // The 'documentInput', 'photosInput', and 'videoInput' refs are defined in innovate.ejs.
      if (
        this.$refs.documentInput &&
        this.$refs.documentInput.files.length > 0
      ) {
        data.append("document", this.$refs.documentInput.files[0]);
      }
      if (this.$refs.videoInput && this.$refs.videoInput.files.length > 0) {
        data.append("video", this.$refs.videoInput.files[0]);
      }
      // For multiple photos, we loop and append each one.
      if (this.$refs.photosInput && this.$refs.photosInput.files.length > 0) {
        for (const file of this.$refs.photosInput.files) {
          data.append("photos", file);
        }
      }

      // 3. Send the request to the backend API.
      axios
        .post("/api/innovations", data, {
          // This header is CRITICAL for file uploads!
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((response) => {
          Alpine.store("notifications").show(
            "Submission Received!",
            "Thank you for sharing your idea with us. It has been successfully submitted."
          );
          // Reset the form fields after a successful submission
          this.formData.title = "";
          this.formData.submission_text = "";
          this.formData.ministry_position = "";
          if (this.$refs.documentInput) this.$refs.documentInput.value = null;
          if (this.$refs.photosInput) this.$refs.photosInput.value = null;
          if (this.$refs.videoInput) this.$refs.videoInput.value = null;
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            "There was an error submitting your idea.";
          Alpine.store("notifications").show("Submission Error", errorMessage);
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    },
  }));

  Alpine.data("jobEditor", (jobId) => ({
    jobId: jobId,
    formData: {
      title: "",
      description: "",
      location: "",
      tags: [],
    },
    tagsInput: "", // Separate model for the comma-separated string
    isLoading: true,
    isSaving: false,
    error: null,

    init() {
      this.isLoading = true;
      axios
        .get(`/api/jobs/${this.jobId}`)
        .then((response) => {
          this.formData = response.data;
          // Convert the tags array back to a string for the input field
          this.tagsInput = this.formData.tags
            ? this.formData.tags.join(", ")
            : "";
        })
        .catch((err) => {
          this.error = "Failed to load job data.";
          console.error(err);
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    saveChanges() {
      this.isSaving = true;
      // Convert the tags string back to an array before sending
      this.formData.tags = this.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      axios
        .put(`/api/jobs/${this.jobId}`, this.formData)
        .then((response) => {
          Alpine.store("toast").show("Job updated successfully!");
          setTimeout(() => {
            window.location.href = "/employers/dashboard";
          }, 1500);
        })
        .catch((error) => {
          const message =
            error.response?.data?.message || "Failed to update job.";
          Alpine.store("notifications").show("Update Error", message);
        })
        .finally(() => {
          this.isSaving = false;
        });
    },
  }));

  Alpine.data("orderList", () => ({
    // STATE
    orders: [],
    isLoading: true,
    pagination: { currentPage: 1, totalPages: 1, totalOrders: 0 },
    filters: {
      searchQuery: "",
      status: "",
      startDate: "",
      endDate: "",
      page: 1,
    },

    // METHODS
    init() {
      // THE FIX: Call fetchOrders() directly on initialization.
      this.fetchOrders();

      // The watcher will now ONLY handle changes AFTER the initial load.
      this.$watch(
        "filters",
        () => {
          // When a filter changes, reset to page 1 and fetch.
          this.filters.page = 1;
          this.fetchOrders();
        },
        { deep: true }
      );
    },

    fetchOrders() {
      this.isLoading = true;

      const params = new URLSearchParams();
      params.append("page", this.filters.page);
      if (this.filters.searchQuery)
        params.append("searchQuery", this.filters.searchQuery);
      if (this.filters.status) params.append("status", this.filters.status);
      if (this.filters.startDate)
        params.append("startDate", this.filters.startDate);
      if (this.filters.endDate) params.append("endDate", this.filters.endDate);

      axios
        .get(`/api/admin/orders?${params.toString()}`)
        .then((response) => {
          this.orders = response.data.orders;
          this.pagination = response.data.pagination;
        })
        .catch((error) => {
          console.error("Error fetching orders:", error);
          // Optionally, set an error state to show a message on the page
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    changePage(newPage) {
      if (newPage > 0 && newPage <= this.pagination.totalPages) {
        this.filters.page = newPage;
        // The watcher will automatically trigger fetchOrders() when this changes.
      }
    },

    // --- NEW METHOD ---
    updateStatus(orderId, newStatus) {
      // Find the order in our local array to update it optimistically
      const order = this.orders.find((o) => o.id === orderId);
      if (!order) return;

      axios
        .put(`/api/admin/orders/${orderId}/status`, { status: newStatus })
        .then((response) => {
          // The API was successful, update the local data to match
          order.status = response.data.order.status;
          Alpine.store("toast").show(`Order status updated to "${newStatus}".`);
        })
        .catch((error) => {
          console.error("Error updating status:", error);
          Alpine.store("notifications").show(
            "Update Failed",
            "Could not update the order status."
          );
          // Optional: revert the dropdown if the API call fails
          this.fetchOrders(); // Refetch to get the true state
        });
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    formatCurrency(price) {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }).format(price);
    },
  })); // Alpine.start();

  Alpine.data("applicantViewer", (jobId) => ({
    jobId: jobId,
    jobTitle: "",
    applicants: [],
    isLoading: true,
    // NEW: Pagination state
    pagination: { currentPage: 1, totalPages: 0, totalApplicants: 0 },

    init() {
      // Fetch the job title once
      axios.get(`/api/jobs/${this.jobId}`).then((response) => {
        this.jobTitle = response.data.title;
      });

      // Fetch the first page of applicants
      this.fetchApplicants(1);
    },

    fetchApplicants(page) {
      this.isLoading = true;
      axios
        .get(`/api/applications/job/${this.jobId}/applicants?page=${page}`)
        .then((response) => {
          this.applicants = response.data.applicants;
          this.pagination = response.data.pagination;
        })
        .catch((error) => console.error("Error loading applicant data:", error))
        .finally(() => {
          this.isLoading = false;
        });
    },

    changePage(newPage) {
      if (newPage > 0 && newPage <= this.pagination.totalPages) {
        this.fetchApplicants(newPage);
      }
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  }));

  Alpine.data("productCreator", () => ({
    // STATE
    formData: {
      name: "",
      description: "",
      price: "",
      stock_quantity: 1,
      brand_id: "",
      sector_id: "",
      original_price: null,
      discount_price: null,
      discount_start_date: null,
      discount_end_date: null,
      contact_details: "",
    },
    imageFile: null,
    brands: [],
    sectors: [],
    isLoading: true,
    isSaving: false,

    // --- MODAL STATE ---
    isModalOpen: false,
    modalType: "", // Will be 'brand' or 'sector'
    newItemName: "",

    // METHODS
    init() {
      this.isLoading = true;
      Promise.all([axios.get("/api/brands"), axios.get("/api/sectors")])
        .then(([brandsRes, sectorsRes]) => {
          this.brands = brandsRes.data;
          this.sectors = sectorsRes.data;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    handleImageUpload(event) {
      this.imageFile = event.target.files[0];
    },

    createProduct() {
      this.isSaving = true;
      const data = new FormData();
      for (const key in this.formData) {
        if (this.formData[key] !== null && this.formData[key] !== "") {
          data.append(key, this.formData[key]);
        }
      }
      if (this.imageFile) {
        data.append("image", this.imageFile);
      }
      axios
        .post("/api/products", data, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((response) => {
          Alpine.store("toast").show("Product created successfully!");
          setTimeout(() => {
            window.location.href = "/admin/products";
          }, 1500);
        })
        .catch((error) => {
          const message =
            error.response?.data?.message || "Failed to create product.";
          Alpine.store("notifications").show("Creation Error", message);
        })
        .finally(() => {
          this.isSaving = false;
        });
    },

    // --- MODAL METHODS ---
    openCreationModal(type) {
      this.modalType = type;
      this.newItemName = "";
      this.isModalOpen = true;
      this.$nextTick(() => {
        document.getElementById(`new_${type}_name`).focus();
      });
    },

    closeModal() {
      this.isModalOpen = false;
    },

    handleCreateNewItem() {
      if (!this.newItemName.trim()) return;

      const endpoint =
        this.modalType === "brand" ? "/api/brands" : "/api/sectors";
      const data = { name: this.newItemName };

      axios
        .post(endpoint, data)
        .then((response) => {
          const newItem = response.data;
          if (this.modalType === "brand") {
            this.brands.push(newItem);
            this.formData.brand_id = newItem.id;
          } else {
            this.sectors.push(newItem);
            this.formData.sector_id = newItem.id;
          }
          Alpine.store("toast").show(
            `${
              this.modalType.charAt(0).toUpperCase() + this.modalType.slice(1)
            } created!`
          );
          this.closeModal();
        })
        .catch((error) => {
          const message =
            error.response?.data?.message ||
            `Failed to create ${this.modalType}.`;
          Alpine.store("notifications").show("Creation Error", message);
        });
    },
  }));

  Alpine.data("userList", () => ({
    // STATE
    users: [],
    isLoading: true,
    pagination: { currentPage: 1, totalPages: 1, totalUsers: 0 },
    counts: { total: 0, admins: 0, employers: 0, users: 0 },
    searchQuery: "",
    currentPage: 1,

    // METHODS
    init() {
      this.fetchUsers(this.currentPage, this.searchQuery);
      this.$watch("searchQuery", () => {
        this.currentPage = 1;
        this.fetchUsers(this.currentPage, this.searchQuery);
      });
    },

    fetchUsers(page, search) {
      this.isLoading = true;
      const params = new URLSearchParams({ page });
      if (search) {
        params.append("searchQuery", search);
      }

      axios
        .get(`/api/admin/users?${params.toString()}`)
        .then((response) => {
          // THE FIX: Read the data from the correct properties
          this.users = response.data.users;
          this.pagination = response.data.pagination;
          this.counts = response.data.counts;
        })
        .catch((error) => console.error("Error fetching users:", error))
        .finally(() => {
          this.isLoading = false;
        });
    },

    changePage(newPage) {
      if (newPage > 0 && newPage <= this.pagination.totalPages) {
        this.currentPage = newPage;
        this.fetchUsers(this.currentPage, this.searchQuery);
      }
    },

    updateRole(userId, newRole) {
      const user = this.users.find((u) => u.id === userId);
      if (!user) return;

      axios
        .put(`/api/admin/users/${userId}/role`, { role: newRole })
        .then((response) => {
          user.role = response.data.user.role;
          Alpine.store("toast").show(`User role updated to "${newRole}".`);
        })
        .catch((error) => {
          const message =
            error.response?.data?.message || "Failed to update role.";
          Alpine.store("notifications").show("Update Failed", message);
          this.fetchUsers(this.currentPage, this.searchQuery); // Revert on failure
        });
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
  }));

  Alpine.data("manageItems", (config) => ({
    type: config.type,
    apiUrl: config.apiUrl,
    items: [],
    isLoading: true,
    newItemName: "",

    init() {
      this.fetchItems();
    },
    fetchItems() {
      this.isLoading = true;
      axios
        .get(this.apiUrl)
        .then((res) => {
          this.items = res.data;
        })
        .catch((err) => {
          Alpine.store("notifications").show(
            "Error",
            `Could not load ${this.type}s.`
          );
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    addItem() {
      if (!this.newItemName.trim()) return;
      axios
        .post(this.apiUrl, { name: this.newItemName })
        .then((res) => {
          this.items.push(res.data);
          this.items.sort((a, b) => a.name.localeCompare(b.name)); // Keep the list sorted
          this.newItemName = "";
          Alpine.store("toast").show(`${this.type} added successfully.`);
        })
        .catch((err) => {
          const message =
            err.response?.data?.message || `Failed to add ${this.type}.`;
          Alpine.store("notifications").show("Error", message);
        });
    },
    deleteItem(id) {
      if (confirm(`Are you sure you want to delete this ${this.type}?`)) {
        axios
          .delete(`${this.apiUrl}/${id}`)
          .then(() => {
            this.items = this.items.filter((item) => item.id !== id);
            Alpine.store("toast").show(`${this.type} deleted.`);
          })
          .catch((err) => {
            const message =
              err.response?.data?.message || `Failed to delete ${this.type}.`;
            Alpine.store("notifications").show("Error", message);
          });
      }
    },
  }));

  Alpine.data("innovationList", () => ({
    innovations: [],
    isLoading: true,
    init() {
      this.isLoading = true;
      axios
        .get("/api/admin/innovations")
        .then((res) => {
          this.innovations = res.data;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
  }));

  Alpine.data("innovationDetail", (innovationId) => ({
    innovationId: innovationId,
    innovation: null,
    isLoading: true,
    error: null,
    filePaths: {}, // To hold the parsed file paths

    init() {
      this.isLoading = true;
      axios
        .get(`/api/admin/innovations/${this.innovationId}`)
        .then((response) => {
          this.innovation = response.data;
          // The file paths are stored as a JSON string, so we need to parse it.
          if (this.innovation.document_path) {
            try {
              this.filePaths = JSON.parse(this.innovation.document_path);
            } catch (e) {
              console.error("Could not parse document_path JSON:", e);
              this.filePaths = {};
            }
          }
        })
        .catch((err) => {
          this.error = "Failed to load innovation details.";
          console.error(err);
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    // Helper to check if there are any files to show
    hasFiles() {
      return (
        this.filePaths.document ||
        this.filePaths.video ||
        (this.filePaths.photos && this.filePaths.photos.length > 0)
      );
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
  }));

  Alpine.data("adminDashboard", () => ({
    stats: null,
    isLoading: true,

    init() {
      this.fetchStats();
    },

    fetchStats() {
      this.isLoading = true;
      axios
        .get("/api/admin/stats")
        .then((response) => {
          this.stats = response.data;
        })
        .catch((error) => console.error("Error fetching stats:", error))
        .finally(() => {
          this.isLoading = false;
        });
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
  }));

  Alpine.data("companyEditor", () => ({
    formData: {}, // Will hold the company data
    companyId: null,
    isLoading: true,
    isSaving: false,
    error: null,

    init() {
      this.isLoading = true;
      // Fetch the logged-in user's company profile
      axios
        .get("/api/employers/my-company")
        .then((response) => {
          if (!response.data) {
            this.error =
              "Could not find a company profile associated with your account.";
            return;
          }
          this.formData = response.data;
          this.companyId = response.data.id;
        })
        .catch((err) => {
          this.error = "Failed to load company data.";
          console.error(err);
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    saveChanges() {
      if (!this.companyId) return;
      this.isSaving = true;

      axios
        .put(`/api/companies/${this.companyId}`, this.formData)
        .then((response) => {
          Alpine.store("toast").show("Company details updated successfully!");
          setTimeout(() => {
            window.location.href = "/employers/dashboard";
          }, 1500);
        })
        .catch((error) => {
          const message =
            error.response?.data?.message ||
            "Failed to update company details.";
          Alpine.store("notifications").show("Update Error", message);
        })
        .finally(() => {
          this.isSaving = false;
        });
    },
  }));
});
