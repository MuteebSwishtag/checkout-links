@extends('shopify-app::layouts.default')

@section('styles')
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    {{-- @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"]) --}}
    @inertiaHead
@endsection

@section('content')
    @inertia
@endsection

@section('scripts')
@parent

    <ui-nav-menu>
        <a href="/" rel="home">Dashboard</a>
        <a href="/links">Links</a>
        <a href="/how-it-works">How it Works</a>
        <a href="/settings">Settings</a>
        <!-- <a href="/">FAQs</a> -->
    </ui-nav-menu>

    <!-- SAFE fetch interceptor -->
    <script>
    (function () {
        const originalFetch = window.fetch.bind(window);

        window.fetch = async (resource, config = {}) => {
            const url =
                typeof resource === 'string'
                    ? resource
                    : resource?.url || '';

            // ❌ Never touch third-party requests
            if (
                // url.startsWith('https://') ||
                url.includes('crisp.chat') ||
                // url.includes('shopify.com')
            ) {
                return originalFetch(resource, config);
            }

            // ✅ Only your backend (relative URLs)
            if (url.startsWith('/')) {
                const token = await shopify.idToken();

                config.headers = {
                    ...(config.headers || {}),
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                };
            }

            return originalFetch(resource, config);
        };
    })();
    </script>

    <!-- Crisp Chat -->
    <script type="text/javascript">
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = "d5fcbb84-156f-480d-8c66-e3a1f15cc3d8";

        (function () {
            var d = document;
            var s = d.createElement("script");
            s.src = "https://client.crisp.chat/l.js";
            s.async = true;
            d.head.appendChild(s);
        })();
    </script>

@endsection
