<?php
namespace App\Repositories\ProductVarient;

use App\Http\Traits\ResponseTrait;
use App\Models\Products\ProductVarient;
use App\Repositories\ProductVarient\ProductVarientRepositoryInterface;


class ProductVarientRepository implements ProductVarientRepositoryInterface
{
    use ResponseTrait;
    protected $model;

    public function __construct(ProductVarient $ProductVarient)
    {
        $this->model = $ProductVarient;
    }
    public function getById(int $id)
    {
        $variant = $this->model->find($id);
        return $variant;
    }
    public function getByShopifyId(int $id)
    {
        $variant = $this->model->where('shopify_product_Varient_id', $id)->first();
        return $variant;
    }
    public function getByProductId(int $id)
    {
        $variants = $this->model->where('product_id', $id)->get();
        return $variants;
    }
    public function updateOrCreate(array $data)
    {
        // Handle any negative inventory quantities gracefully
        if (isset($data['inventory_quantity']) && $data['inventory_quantity'] < 0) {
            // Log the negative inventory instead of failing
            \Log::info('Handling negative inventory for product variant', [
                'variant_id' => $data['shopify_product_varient_id'] ?? 'unknown',
                'inventory_quantity' => $data['inventory_quantity']
            ]);

            // Database now supports negative values after our migration
            // But if you have issues, you can uncomment this line:
            // $data['inventory_quantity'] = 0;
        }

        $productVarient = $this->model->updateOrCreate($data);
        return $productVarient;
    }
    public function delete(int $id)
    {
        $varient = $this->getById($id);
        $varient->delete();
    }
}

