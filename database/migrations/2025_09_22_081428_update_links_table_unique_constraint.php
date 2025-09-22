<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('links', function (Blueprint $table) {
            // Drop the existing unique constraint on link_name
            $table->dropUnique(['link_name']);
            
            // Add a composite unique constraint on user_id and link_name
            $table->unique(['user_id', 'link_name'], 'links_user_id_link_name_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('links', function (Blueprint $table) {
            // Drop the composite unique constraint
            $table->dropUnique('links_user_id_link_name_unique');
            
            // Add back the global unique constraint (if you want to revert)
            $table->unique('link_name');
        });
    }
};
