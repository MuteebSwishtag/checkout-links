<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // CRITICAL: Add indexes to product_varients table (fixes 5-11s DELETE queries)
        Schema::table('product_varients', function (Blueprint $table) {
            $table->index('product_id', 'idx_product_varients_product_id');
            $table->index('shopify_product_varient_id', 'idx_product_varients_shopify_id');
            $table->index('shopify_inventory_item_id', 'idx_product_varients_inventory_id');
        });

        // Add indexes to products table
        Schema::table('products', function (Blueprint $table) {
            $table->index('user_id', 'idx_products_user_id');
            $table->index('shopify_product_id', 'idx_products_shopify_product_id');
            $table->index(['user_id', 'shopify_product_id'], 'idx_products_user_shopify');
        });

        // Add indexes to orders table
        Schema::table('orders', function (Blueprint $table) {
            $table->index('shopify_order_id', 'idx_orders_shopify_id');
            $table->index('user_id', 'idx_orders_user_id');
            $table->index('order_customer_id', 'idx_orders_customer_id');
            $table->index(['user_id', 'shopify_order_id'], 'idx_orders_user_shopify');
        });

        // Add indexes to order_customers table
        Schema::table('order_customers', function (Blueprint $table) {
            $table->index('shopify_customer_id', 'idx_order_customers_shopify_id');
            $table->index('email', 'idx_order_customers_email');
        });

        // Add indexes to order_line_items table
        Schema::table('order_line_items', function (Blueprint $table) {
            $table->index('shopify_order_lineitem_id', 'idx_order_line_items_shopify_id');
            $table->index('order_id', 'idx_order_line_items_order_id');
            $table->index('shopify_product_variant_id', 'idx_order_line_items_variant_id');
        });

        // Add indexes to order_fulfillments table
        Schema::table('order_fulfillments', function (Blueprint $table) {
            $table->index('shopify_order_fulfillment_id', 'idx_order_fulfillments_shopify_id');
            $table->index('order_id', 'idx_order_fulfillments_order_id');
        });

        // Add indexes to order_shipping_addresses table
        Schema::table('order_shipping_addresses', function (Blueprint $table) {
            $table->index('order_id', 'idx_order_shipping_addresses_order_id');
        });

        // Add indexes to product_media table
        Schema::table('product_media', function (Blueprint $table) {
            $table->index('product_id', 'idx_product_media_product_id');
            $table->index('shopify_product_media_id', 'idx_product_media_shopify_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_varients', function (Blueprint $table) {
            $table->dropIndex('idx_product_varients_product_id');
            $table->dropIndex('idx_product_varients_shopify_id');
            $table->dropIndex('idx_product_varients_inventory_id');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_user_id');
            $table->dropIndex('idx_products_shopify_product_id');
            $table->dropIndex('idx_products_user_shopify');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_shopify_id');
            $table->dropIndex('idx_orders_user_id');
            $table->dropIndex('idx_orders_customer_id');
            $table->dropIndex('idx_orders_user_shopify');
        });

        Schema::table('order_customers', function (Blueprint $table) {
            $table->dropIndex('idx_order_customers_shopify_id');
            $table->dropIndex('idx_order_customers_email');
        });

        Schema::table('order_line_items', function (Blueprint $table) {
            $table->dropIndex('idx_order_line_items_shopify_id');
            $table->dropIndex('idx_order_line_items_order_id');
            $table->dropIndex('idx_order_line_items_variant_id');
        });

        Schema::table('order_fulfillments', function (Blueprint $table) {
            $table->dropIndex('idx_order_fulfillments_shopify_id');
            $table->dropIndex('idx_order_fulfillments_order_id');
        });

        Schema::table('order_shipping_addresses', function (Blueprint $table) {
            $table->dropIndex('idx_order_shipping_addresses_order_id');
        });

        Schema::table('product_media', function (Blueprint $table) {
            $table->dropIndex('idx_product_media_product_id');
            $table->dropIndex('idx_product_media_shopify_id');
        });
    }
};
