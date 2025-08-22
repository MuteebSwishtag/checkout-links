<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();

            // Link to user (or shop, depending on your structure)
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Setting key (e.g. "brand_color", "brand_color_hex", "custom_css")
            $table->string('key');

            // Value stored as text (can be JSON, CSS, HEX, etc.)
            $table->longText('value')->nullable();

            $table->timestamps();

            // Ensure unique setting per user
            $table->unique(['user_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
