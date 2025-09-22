<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class Link extends Model {
    use HasFactory;

    protected $fillable = ['user_id', 'link_name', 'link_url', 'discount_code', 'discount_code_value', 'discount_value', 'free_shipping', 'order_discount', 'single_order', 'clicks', 'placed_order'];

    protected $casts = [
        'discount_code' => 'boolean',
        'free_shipping' => 'boolean',
        'order_discount' => 'boolean',
        'single_order' => 'boolean',
    ];

    public function popupMessage() {
        return $this->hasOne(PopupMessage::class);
    }

    public function linkedVariants() {
        return $this->hasMany(LinkProductVarient::class, 'link_id');
    }

    public function user() {
        return $this->belongsTo(User::class);
    }

    // Add validation rules method for per-user uniqueness
    public static function validationRules($userId, $linkId = null)
    {
        return [
            'linkName' => [
                'required',
                'string',
                'max:255',
                Rule::unique('links', 'link_name')
                    ->where('user_id', $userId)
                    ->ignore($linkId) // Ignore current link when editing
            ],
            'linkId' => 'required|string',
            'selectedProductItems' => 'required|array|min:1',
            'selectedProductItems.*.productId' => 'required',
        ];
    }

    // Get validation messages
    public static function validationMessages()
    {
        return [
            'linkName.required' => 'The link name is required',
            'linkName.unique' => 'You already have a link with this name. Please choose a different name.',
            'linkName.max' => 'The link name may not be greater than 255 characters.',
            'linkId.required' => 'The link ID is required',
            'selectedProductItems.required' => 'At least one product must be selected',
            'selectedProductItems.min' => 'At least one product must be selected',
            'selectedProductItems.*.productId.required' => 'Product ID is required',
        ];
    }
}

