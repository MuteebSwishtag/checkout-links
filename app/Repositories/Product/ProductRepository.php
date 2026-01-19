<?php
namespace App\Repositories\Product;

use App\Models\LinkProductVarient;
use App\Models\Product;
use App\Http\Traits\ResponseTrait;
use Illuminate\Support\Facades\Log;
use App\Http\Resources\ProductResource;
use App\Repositories\Product\ProductRepositoryInterface;
use App\Repositories\ProductMedia\ProductMediaRepositoryInterface;
use App\Repositories\ProductVarient\ProductVarientRepositoryInterface;


class ProductRepository implements ProductRepositoryInterface
{
    use ResponseTrait;
    protected $model;
    protected $productVarient;
    protected $productMedia;
    public function __construct(Product $product, ProductVarientRepositoryInterface $productVarient, ProductMediaRepositoryInterface $productMedia)
    {
        $this->model = $product;
        $this->productVarient = $productVarient;
        $this->productMedia = $productMedia;
    }
    public function getById(int $id)
    {
        $product = $this->model->find($id);
        return $product;
    }
    public function getByShopifyId(int $id)
    {
        $product = $this->model->where('shopify_product_id', $id)->first();
        return $product;
    }
    public function getByUserId(int $id)
    {
        $products = $this->model->where('user_id', $id)->get();
        return $products;
    }
    public function updateOrCreate(array $data)
    {
        $varients = $data['variants'];
        unset($data['variants']);

        $medias = $data['media'];
        unset($data['media']);

        // Separate unique identifiers from update fields
        $uniqueKeys = [
            'shopify_product_id' => $data['shopify_product_id'],
            'user_id' => $data['user_id'],
        ];
        
        // Fields to update
        $updateFields = [
            'title' => $data['title'],
            'vendor' => $data['vendor'],
            'status' => $data['status'],
            'published' => $data['published'],
        ];

        $product = $this->model->updateOrCreate($uniqueKeys, $updateFields);

        // Get existing variant IDs for this product
        $existingVariantIds = $this->productVarient->getByProductId($product->id)->pluck('shopify_product_varient_id')->toArray();
        $newVariantIds = array_column($varients, 'shopify_product_varient_id');

        foreach ($varients as $varient) {
            $varient['product_id'] = $product->id;
            $this->productVarient->updateOrCreate($varient);
        }

        // Delete variants that no longer exist in Shopify
        $variantsToDelete = array_diff($existingVariantIds, $newVariantIds);
        foreach ($variantsToDelete as $variantId) {
            $variant = $this->productVarient->getByShopifyId($variantId);
            if ($variant) {
                // Also delete linked product variants
                LinkProductVarient::where('variant_id', $variantId)->delete();
                $this->productVarient->delete($variant->id);
            }
        }

        // Delete all existing media and recreate (since media can change completely)
        $existingMedias = $this->productMedia->getByProductId($product->id);
        foreach ($existingMedias as $existingMedia) {
            $this->productMedia->delete($existingMedia->id);
        }

        foreach ($medias as $media) {
            $media['product_id'] = $product->id;
            $this->productMedia->updateOrCreate($media);
        }

        return $product;
    }
    public function delete(int $id)
    {
        $product = $this->getById($id);
        
        if (!$product) {
            Log::warning("Attempted to delete non-existent product with ID: {$id}");
            return;
        }
        
        $variants = $this->productVarient->getByProductId($product->id);
        $medias = $this->productMedia->getByProductId($product->id);
        
        // First, remove all link associations for this product and its variants
        // Clean up by product_id (covers all variants of this product)
        $deletedByProductId = LinkProductVarient::where('product_id', $product->id)->delete();
        if ($deletedByProductId > 0) {
            Log::info("Removed {$deletedByProductId} link associations for product ID: {$product->id} (Shopify ID: {$product->shopify_product_id})");
        }
        
        // Also clean up by variant_id to catch any edge cases
        foreach ($variants as $variant) {
            $deletedByVariantId = LinkProductVarient::where('variant_id', $variant->shopify_product_varient_id)->delete();
            if ($deletedByVariantId > 0) {
                Log::info("Removed {$deletedByVariantId} link associations for variant ID: {$variant->shopify_product_varient_id}");
            }
            $this->productVarient->delete($variant->id);
        }
        
        // Delete media
        foreach ($medias as $media) {
            $this->productMedia->delete($media->id);
        }
        
        // Finally delete the product
        $product->delete();
        Log::info("Successfully deleted product ID: {$id} (Shopify ID: {$product->shopify_product_id})");
    }
}

