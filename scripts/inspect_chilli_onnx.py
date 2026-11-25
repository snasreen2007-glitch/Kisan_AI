import onnx

model = onnx.load("public/models/chilli_mobilenetv3.onnx")
print("IR version:", model.ir_version)
print("Opset:", model.opset_import)
print("Inputs:")
for inp in model.graph.input:
    print(f"  - {inp.name}: {[d.dim_value for d in inp.type.tensor_type.shape.dim]}")
print("Outputs:")
for out in model.graph.output:
    print(f"  - {out.name}: {[d.dim_value for d in out.type.tensor_type.shape.dim]}")

