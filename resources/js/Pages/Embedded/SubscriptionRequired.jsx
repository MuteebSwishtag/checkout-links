import { Head } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import checkoutDownloadLogo from '@/Pages/Images/cllogo.png';

export default function SubscriptionRequired({ subscribeUrl }) {
    const subscribeButtonRef = useRef(null);

    useEffect(() => {
        subscribeButtonRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
            }

            if (event.key === 'Tab') {
                event.preventDefault();
                subscribeButtonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, []);

    return (
        <>
            <Head title="Subscription Required" />

            <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-transparent px-4 py-8 text-[#303030]">
                <section
                    aria-labelledby="subscription-required-title"
                    aria-modal="true"
                    className="w-full max-w-[360px] rounded-2xl border border-[#dfe3e8] bg-white p-6 text-center shadow-[0_18px_48px_rgba(48,48,48,0.16)] sm:p-7"
                    role="dialog"
                >
                    <img
                        alt="Checkout Links"
                        className="mx-auto mb-5 h-16 w-16 rounded-xl"
                        src={checkoutDownloadLogo}
                    />

                    <h1
                        className="text-xl font-semibold tracking-normal text-[#202223]"
                        id="subscription-required-title"
                    >
                        Subscribe to unlock Checkout Links
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-[#5c5f62]">
                        Upgrade your plan to create and manage checkout links
                        for your store.
                    </p>

                    <p className="mt-3 rounded-lg bg-[#f6f6f7] px-3 py-2 text-xs leading-5 text-[#6d7175]">
                        Approve your subscription securely through Shopify.
                    </p>

                    <a
                        className="mt-6 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#303030] focus:outline-none focus:ring-4 focus:ring-[#dfe3e8]"
                        href={subscribeUrl}
                        ref={subscribeButtonRef}
                    >
                        Subscribe
                    </a>
                </section>
            </main>
        </>
    );
}
