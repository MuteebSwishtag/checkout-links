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

    <script>
const { fetch: originalFetch } = window;

window.fetch = async (...args) => {
    let [resource, config] = args;

    // Check if the request is to Crisp Chat
    if (typeof resource === 'string' && resource.startsWith('https://client.crisp.chat')) {
        // Just forward the request unmodified
        return originalFetch(resource, config);
    }

    // Otherwise, add Authorization header
    let token = await shopify.idToken();
    config = {
        ...config,
        headers: {
            ...config?.headers,
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    return originalFetch(resource, config);
};
</script>
<script type="text/javascript">window.$crisp=[];window.CRISP_WEBSITE_ID="d5fcbb84-156f-480d-8c66-e3a1f15cc3d8";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>
 @endsection