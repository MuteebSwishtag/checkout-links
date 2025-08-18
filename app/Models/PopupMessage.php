<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PopupMessage extends Model {
    use HasFactory;

    protected $fillable = [
        'link_id', 'allow_deselect', 'checkout_button_text', 'close_button_link',
        'close_button_text', 'copy_text', 'countdown_active', 'heading_text',
        'is_active', 'message_text', 'show_order_total', 'show_price', 'timer_text'
    ];

    public function link() {
        return $this->belongsTo(Link::class);
    }
}

