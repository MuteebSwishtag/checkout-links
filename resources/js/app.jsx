import '../css/app.css';
import './bootstrap';
import "@shopify/polaris/build/esm/styles.css";
import { createInertiaApp } from '@inertiajs/react';
import { AppProvider } from '@shopify/polaris';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import enTranslations from '@shopify/polaris/locales/en.json';
import { Toaster } from 'react-hot-toast'; // Add this import

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <AppProvider i18n={enTranslations}>
                {/* Add Toaster component here */}
                <Toaster
                    position="bottom-center"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#363636',
                            color: '#fff',
                            fontSize: '16px',
                            padding: '16px',
                        },
                    }}
                    // Limit to one toast at a time
                    limit={1}
                />
                <App {...props} />
            </AppProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});