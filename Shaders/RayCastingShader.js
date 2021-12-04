const RayCastingShader = {
    vsSrc:
    `#version 300 es
	in vec3 pos;
	uniform mat4 M_DATA_TO_CLIP_SPACE;
	uniform float xDim;
	uniform float yDim;
	uniform float zDim;


	out vec3 texCoord;
	out vec3 v_surfaceToLight;
	out vec3 v_surfaceToCam;
	void main(void) { 
		texCoord = vec3(
			pos.x/xDim,
			pos.y/yDim,
			pos.z/zDim
		);
		gl_Position = M_DATA_TO_CLIP_SPACE * vec4(      
			pos.x,
			pos.y,                   
			pos.z,                   
			1.0                  
		); 

    }`,
    fsSrc:
`#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;
// reguler sampler
uniform highp sampler3D volSampler; 
uniform highp sampler2D colSampler;
uniform highp sampler2D opcSampler;

// no skippiing
uniform highp sampler2D exitPointSampler;
uniform highp sampler2D preIntSampler;


// approx geo
uniform highp sampler2D approxEntryPointDepthSampler;
uniform highp sampler2D approxExitPointSampler;
//uniform highp sampler2D approxEntryPointSampler; // not used

// octree
uniform highp usampler2D octreeTagSampler;
uniform highp usampler2D octreeStartPointSampler;
uniform highp usampler2D octreeEndPointSampler;

// occupancy geometry
uniform highp usampler2D occuGeoTagSampler;
uniform highp usampler2D occuGeoStartPointSampler;
uniform highp usampler2D occuGeoEndPointSampler;
uniform highp usampler2D visibilityOrderSampler;

uniform int octreeTextureLength;
uniform int visibilityOrderLength;

uniform float xDim;
uniform float yDim;
uniform float zDim;
uniform float sampleDistance;
uniform float dataMin;
uniform float dataMax;
uniform int width;
uniform int height;

uniform mat4 M_WORLD_TO_DATA_SPACE;
uniform mat4 M_DATA_TO_WORLD_SPACE;
// lighting
uniform vec3 lightWorldPosition;
uniform vec3 camWorldPosition;
uniform vec3 lightColor;
uniform int doLighting;
uniform int preIntegrated;
uniform int skipMode;
out vec4 fragColor;
in vec3 texCoord;

#define MAX_RAYEVENTLIST_SIZE 100
struct octreeNode {
	uvec3 startPoint;
	uvec3 endPoint;
	int index;
	int occuClass;
};
struct rayEvent {
	float depth;
	int type;
	int occuClass;
};

rayEvent rayEventList[MAX_RAYEVENTLIST_SIZE];

vec3 centralDifferenceNormal(vec3 texCoord) {
	float h_x = 1.0/xDim;
	float h_y = 1.0/yDim;
	float h_z = 1.0/zDim;
	float v_normal_x = 
		texture(volSampler, vec3(
			texCoord.x + h_x,
			texCoord.y,
			texCoord.z
		)).r 
		-
		texture(volSampler, vec3(
			texCoord.x - h_x,
			texCoord.y,
			texCoord.z
		)).r;
	float v_normal_y = 
		texture(volSampler, vec3(
			texCoord.x,
			texCoord.y + h_y,
			texCoord.z
		)).r 
		-
		texture(volSampler, vec3(
			texCoord.x,
			texCoord.y - h_y,
			texCoord.z
		)).r;
	float v_normal_z = 
		texture(volSampler, vec3(
			texCoord.x,
			texCoord.y,
			texCoord.z + h_z
		)).r 
		-
		texture(volSampler, vec3(
			texCoord.x,
			texCoord.y,
			texCoord.z - h_z
		)).r;

	// normal
	vec3 v_normal = vec3(v_normal_x, v_normal_y, v_normal_z);

	vec3 normal = normalize(v_normal);

	// if(v_normal.x == 0.0 && v_normal.y == 0.0 && v_normal.z == 0.0) {
	// 	normal = vec3(0,0,0);			
	// }

	return normal;
}
float abs(float x) {
	if(x < 0.0) return -x;
	return x;
}
bool inNode(vec3 curPoint, vec3 startPoint, vec3 endPoint) {
	return
		(startPoint.x < curPoint.x || (abs(startPoint.x - curPoint.x) < 1.0)) && (curPoint.x < endPoint.x || (abs(endPoint.x - curPoint.x) < 1.0))
		&&
		(startPoint.y < curPoint.y || (abs(startPoint.y - curPoint.y) < 1.0)) && (curPoint.y < endPoint.y || (abs(endPoint.y - curPoint.y) < 1.0))
		&&
		(startPoint.z < curPoint.z || (abs(startPoint.z - curPoint.z) < 1.0)) && (curPoint.z < endPoint.z || (abs(endPoint.z - curPoint.z) < 1.0));
		
}
octreeNode searchCurNode(uvec3 curPoint) {
	octreeNode targetNode;
	if(octreeTextureLength == 1) {
		targetNode.index = 0;
		return targetNode;
	}
	int index = 1;
	int loopCount = 0;
	// 10 should be the maximum depth for octree
	while(loopCount < 10) {
		loopCount++;
		for(int j = 0; j < 8; ++j) {
			// adding 0.5 for precision purpose
			float normalizedIndex = (float(index+j)+0.5)/float(octreeTextureLength);
			uvec3 nodeStartPoint = texture(octreeStartPointSampler, vec2(normalizedIndex, 1)).xyz;
			uvec3 nodeEndPoint = texture(octreeEndPointSampler, vec2(normalizedIndex, 1)).xyz;
			
			if(inNode(vec3(curPoint), vec3(nodeStartPoint), vec3(nodeEndPoint))) {
				uvec2 tags = texture(octreeTagSampler, vec2(normalizedIndex, 1)).rg;
				bool isLeafNode = (int(tags.x) == 0); 
				if(isLeafNode) {
					targetNode.startPoint = nodeStartPoint;
					targetNode.endPoint = nodeEndPoint;
					targetNode.index = index;
					targetNode.occuClass = int(tags.y);
					return targetNode;	
				}
				index = int(tags.x);
				break;
			}
		}
	}
	targetNode.index = -1;
	return targetNode;
}
vec4 performRayCasting(vec3 entryPoint, vec3 exitPoint, vec3 dstColor, float dstAlpha) {
	// constant params
	vec3 dims = vec3(xDim, yDim, zDim);
	vec3 fullRay = (exitPoint - entryPoint) * dims;
	vec3 rayDirection = normalize(fullRay);
	float totalDistance = length(fullRay);
	int nSample = int(totalDistance/sampleDistance);
	vec3 t0 = entryPoint * dims;
	int preMultiplied = preIntegrated;

	// variable params
	vec3 rayPos = t0;
	// vec3 dstColor = vec3(0.0, 0.0, 0.0);
	// float dstAlpha = 0.0;
	vec3 newTexCoord = entryPoint;
	vec3 lightColorMultiplied;
	for(int i = preIntegrated; i < nSample; i++, rayPos += rayDirection * sampleDistance) {
		float opacity;
		vec3 color;
		if(preIntegrated == 1) {
			// pre integral
			vec3 rayPosA = t0 + float(i-1) * rayDirection * sampleDistance;
			vec3 rayPosB = t0 + float(i) * rayDirection * sampleDistance;

			vec3 tcA = rayPosA / dims;
			vec3 tcB = rayPosB / dims;

			float normDataValueA = (texture(volSampler, tcA).r - dataMin) / (dataMax - dataMin);
			float normDataValueB = (texture(volSampler, tcB).r - dataMin) / (dataMax - dataMin);
			
			newTexCoord = (tcA + tcB)/2.0;
			vec4 preIntColor = texture(preIntSampler, vec2(normDataValueA, normDataValueB)).rgba;
			opacity = preIntColor.a;
			color = preIntColor.rgb;
		} else {
			newTexCoord = rayPos/dims;
			float dataValue = texture(volSampler, newTexCoord).r;
			float normDataValue = (dataValue - dataMin) / (dataMax - dataMin);
			opacity = texture(opcSampler, vec2(normDataValue, 0.5)).r;
			color = texture(colSampler, vec2(normDataValue, 0.5)).rgb;
		}
		if(opacity == 0.0) continue;
		
		

		if(doLighting == 1) {
			vec3 Ia = vec3( 1.0, 1.0, 1.0 );

			//  diffuse light color
			vec3 Id = lightColor;

			//  specular light color
			vec3 Is = lightColor;                

			//  ambient material color
			vec3 Ma = color;

			//  diffuse material color
			vec3 Md = color;

			// specular material color
			vec3 Ms = color;
			

			// amount of ambient light
			float Ka = 0.3;

			// amount of diffuse light
			float Kd = 0.8;

			// amount of specular light
			float Ks = 0.8;
				
			// shininess of material, affects specular lighting
			float shininess = 20.0;

			// sample point world space pos
			vec3 sampleWorldSpace = (M_DATA_TO_WORLD_SPACE * vec4(
				rayPos.x,
				rayPos.y,
				rayPos.z,
				1.0
			)).xyz;

			vec3 normal = centralDifferenceNormal(newTexCoord);

			// light dir
			vec3 v_surfaceToLight =  sampleWorldSpace - lightWorldPosition;
			vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
			
			// cam dir
			vec3 v_surfaceToCam = sampleWorldSpace - camWorldPosition;
			vec3 surfaceToCamDirection = normalize(v_surfaceToCam);
			
			// half vec
			vec3 halfVector = normalize(surfaceToLightDirection + surfaceToCamDirection);
			
			// light & spec
			float lambertian = max(dot(normal, surfaceToLightDirection ), 0.0);
			
			
			vec3 ambient = Ma * Ia;
			vec3 diffuse = Md * Id * lambertian;

			vec3 specular = (lambertian <= 0.0) ? vec3(0.0) : Is * Ms * pow( max(dot(normal, halfVector), 0.0), shininess);
			
			// do lighting
			color  = min(  Ka * ambient + Kd * diffuse + Ks * specular, vec3( 1.0 ) );
	
		}

	
		float unitDist = 1.0;

		// correction
		float srcAlphaCorrected = 1.0 - pow(1.0 - opacity, sampleDistance / unitDist);

		vec3 srcColorCorrected =  color *  ( sampleDistance / unitDist );

		if(preMultiplied == 0) {
			srcColorCorrected *= opacity;
		}
		
		// composite
		dstAlpha += (1.0 - dstAlpha) * srcAlphaCorrected;
		dstColor += (1.0 - dstAlpha) * srcColorCorrected;
		
		if(1.0 - dstAlpha == 0.0) break;
		
		// // move forward
		// rayPos += rayDirection * sampleDistance;
	}	
	return vec4(dstColor, dstAlpha);
}
bool getIntersection(float fDst1, float fDst2, vec3 p1, vec3 p2, out vec3 hit) {
	if ( (fDst1 * fDst2) > 0.0f) return false;
	if ( fDst1 == fDst2) return false; 
	hit = p1 + (p2-p1) * ( -fDst1/(fDst2-fDst1) );
	return true;
}
	
bool inBox( vec3 hit, vec3 b1, vec3 b2, int axis) {
	if ( axis==1 && hit.z >= b1.z && hit.z <= b2.z && hit.y >= b1.y && hit.y <= b2.y) return true;
	if ( axis==2 && hit.z >= b1.z && hit.z <= b2.z && hit.x >= b1.x && hit.x <= b2.x) return true;
	if ( axis==3 && hit.x >= b1.x && hit.x <= b2.x && hit.y >= b1.y && hit.y <= b2.y) return true;
	return false;
}

vec3 linePlaneIntersec(vec3 p0, vec3 p1, vec3 planePoint, vec3 planeNormal) {
	if(dot(p0, planeNormal) > dot(p1, planeNormal)) {
		vec3 tmp = p0;
		p0 = p1;
		p1 = tmp;
	}
	vec3 u = p1-p0;
	float dotResult = dot(planeNormal, u);
	vec3 result = vec3(0,0,0);
	if(dotResult > 0.01) {
		vec3 w = p0 - planePoint;
		float factor = -dot(planeNormal, w)/dotResult;
		u = u*factor;
		return p0+u;
	}
	return vec3(-1, -1, -1);

}
// returns true if line (L1, L2) intersects with the box (B1, B2)
// returns intersection point in Hit
bool checkLineBox( vec3 B1, vec3 B2, vec3 L1, vec3 L2, out vec3 entryPoint, out vec3 exitPoint) {
	
	vec3 xyNormal = vec3(0, 0, 1);
	vec3 xzNormal = vec3(0, 1, 0);
	vec3 yzNormal = vec3(1, 0, 0);

	int pointCount = 0;
	bool findOne = false;

	vec3 p1 = linePlaneIntersec(L1, L2, B1, xyNormal);	// xy, z=0
	
	vec3 p2 = linePlaneIntersec(L1, L2, B2, xyNormal);	// xy, z=1

	vec3 p3 = linePlaneIntersec(L1, L2, B1, xzNormal);	// xz, y=0

	vec3 p4 = linePlaneIntersec(L1, L2, B2, xzNormal);	// xz, y=1

	vec3 p5 = linePlaneIntersec(L1, L2, B1, yzNormal);	// yz, x=0

	vec3 p6 = linePlaneIntersec(L1, L2, B2, yzNormal);	// yz, x=1

	vec3 points[6] = vec3[6](p1, p2, p3, p4, p5, p6);
	for(int i = 0; i < 6; ++i) {
		if(inNode(vec3(points[i]), B1, B2)) {
			pointCount++;

			if(findOne) {
				exitPoint = vec3(points[i]);
				return true;
			} else {
				entryPoint = vec3(points[i]);
				findOne = true;
			}
		}
	}
	return false;
	// if(!findOne) return false;
	
	
	// return false;
	// if (L2.x < B1.x && L1.x < B1.x) return false;
	// if (L2.x > B2.x && L1.x > B2.x) return false;

	// if (L2.y < B1.y && L1.y < B1.y) return false;
	// if (L2.y > B2.y && L1.y > B2.y) return false;

	// if (L2.z < B1.z && L1.z < B1.z) return false;
	// if (L2.z > B2.z && L1.z > B2.z) return false;

	// if (L1.x > B1.x && L1.x < B2.x &&
	// 	L1.y > B1.y && L1.y < B2.y &&
	// 	L1.z > B1.z && L1.z < B2.z) 
	// 	{
	// 		Hit = L1; 
	// 		return true;
	// 	}	

	// bool result = false;
	// if ( (getIntersection( L1.x-B1.x, L2.x-B1.x, L1, L2, entryPoint) && inBox( entryPoint, B1, B2, 1 ))
	// 	|| (getIntersection( L1.y-B1.y, L2.y-B1.y, L1, L2, entryPoint) && inBox( entryPoint, B1, B2, 2 )) 
	// 	|| (getIntersection( L1.z-B1.z, L2.z-B1.z, L1, L2, entryPoint) && inBox( entryPoint, B1, B2, 3 )) 
	// ) {
	// 	result = true;
	// }
	// if( (getIntersection( L1.x-B2.x, L2.x-B2.x, L1, L2, exitPoint) && inBox( exitPoint, B1, B2, 1 )) 
	// 	|| (getIntersection( L1.y-B2.y, L2.y-B2.y, L1, L2, exitPoint) && inBox( exitPoint, B1, B2, 2 )) 
	// 	|| (getIntersection( L1.z-B2.z, L2.z-B2.z, L1, L2, exitPoint) && inBox( exitPoint, B1, B2, 3 ))) {
	// 		result = true;
	// 	}
	// return result;
}
int mergeRayEvent(float depth, int type, int occuClass, out int rayEventNum) {
	return 0;
	if(rayEventNum == 0) return 0;

	rayEvent eventPrev = rayEventList[rayEventNum-1];
	if(eventPrev.depth == depth) {
		if(eventPrev.type == type) {	// both exit/entry
			// overwrite last ray event
			rayEventList[rayEventNum-1].depth = depth;
			rayEventList[rayEventNum-1].occuClass = occuClass;
			return 1;
		} else if(type == 1) {	// entry, exit
			// delete last ray event
			rayEventNum--;
			return 1;
		} else if(type == 0) {
			if(rayEventNum < 2) return 0;
			rayEvent eventPrevPrev = rayEventList[rayEventNum-2];
			if(eventPrevPrev.occuClass == occuClass) {
				// delete last event
				rayEventNum--;
				return 1;
			}
		}
	}
	return 0;

}
void addRayEvent(float depth, int type, int occuClass, out int rayEventNum) {
	rayEvent newEvent;
		newEvent.depth = depth;
		newEvent.type = type;
		newEvent.occuClass = occuClass;
		rayEventList[rayEventNum] = newEvent;
		rayEventNum = rayEventNum + 1;
	return;
	int mergeFlag = mergeRayEvent(depth, type, occuClass, rayEventNum);
	if(mergeFlag == 0) {	// no merging or deletion happens
		rayEvent newEvent;
		newEvent.depth = depth;
		newEvent.type = type;
		newEvent.occuClass = occuClass;
		rayEventList[rayEventNum] = newEvent;
		rayEventNum = rayEventNum + 1;
	}
}

void main(void) {

	vec2 fragPos = gl_FragCoord.xy;
	vec2 normalizedFragPos = fragPos / vec2(width, height);
	vec3 entryPoint, exitPoint;

	if(skipMode == 0) {
		entryPoint = texCoord;
		exitPoint = texture(exitPointSampler, normalizedFragPos.xy).xyz;

		fragColor = performRayCasting(entryPoint, exitPoint, vec3(0,0,0), 0.0);
	} else if(skipMode == 1) {
		float entryPointDepth = texture(approxEntryPointDepthSampler, normalizedFragPos.xy).x;
		if(gl_FragCoord.z > entryPointDepth) discard;
		entryPoint = texCoord;
		exitPoint = texture(approxExitPointSampler, normalizedFragPos.xy).xyz;
		
		//exitPoint = texture(exitPointSampler, normalizedFragPos.xy).xyz;
		fragColor = performRayCasting(entryPoint, exitPoint, vec3(0,0,0), 0.0);

	} else if(skipMode == 2) {
		// entry and exit point for full ray
		vec4 dstRGBA = vec4(0,0,0,0);
		entryPoint = texCoord;
		exitPoint = texture(exitPointSampler, normalizedFragPos.xy).xyz;
		vec3 dims = vec3(xDim, yDim, zDim);
		vec3 entryPointDataSpace = vec3(
			entryPoint.x * dims.x,
			entryPoint.y * dims.y,
			entryPoint.z * dims.z
		);
		vec3 exitPointDataSpace = vec3(
			exitPoint.x * dims.x,
			exitPoint.y * dims.y,
			exitPoint.z * dims.z
		);
		vec3 fullRay = (exitPoint - entryPoint) * dims; // dataspace
		float totalDistance = length(fullRay);
		vec3 rayDirection = normalize(exitPoint - entryPoint);

		vec3 nodeEntryPoint = entryPoint;
		float renderedDistance = 0.0;
		int i = 0;
		while(i < 10) {
			i++;
			if(renderedDistance >= totalDistance) {
				break;
			}
			// find out which leaf node this point is in
			uvec3 nodeEntryPointDataSpace = uvec3(
				nodeEntryPoint.x * xDim,
				nodeEntryPoint.y * yDim,
				nodeEntryPoint.z * zDim
			);
			octreeNode curNode = searchCurNode(nodeEntryPointDataSpace);
			int curNodeIndex = curNode.index;
			if(curNodeIndex == -1) {
				fragColor = vec4(0, 0, 1, 1);
				return;
			}
			// octreeExitPoint
			vec3 nodeExitPointDataSpace = vec3(0,0,0);
			vec3 tmp = vec3(0,0,0);
			// calculate intersection point of line (entry,exit) and box curNode
			if(checkLineBox(vec3(curNode.startPoint), vec3(curNode.endPoint), entryPointDataSpace, exitPointDataSpace, tmp, nodeExitPointDataSpace) == false) {
				//nodeExitPointDataSpace = vec3(nodeEntryPointDataSpace) + rayDirection*sampleDistance*dims;
				
				nodeExitPointDataSpace = vec3(nodeEntryPointDataSpace);
				return;
			}
			
			float nodeDistance = length(vec3(nodeExitPointDataSpace) - vec3(nodeEntryPointDataSpace));
			renderedDistance += nodeDistance;
			
			vec3 nodeExitPoint = vec3(
				float(nodeExitPointDataSpace.x)/xDim,
				float(nodeExitPointDataSpace.y)/yDim,
				float(nodeExitPointDataSpace.z)/zDim
			);
			nodeExitPoint += rayDirection*sampleDistance/dims;
			// skip empty node
			float normalizedIndex = (float(curNodeIndex)+0.5)/float(octreeTextureLength);
			uvec2 tags = texture(octreeTagSampler, vec2(normalizedIndex, 1)).rg;
			int occuClass = int(tags.y);

			if(occuClass != 0) { // non-empty
				dstRGBA = performRayCasting(nodeEntryPoint, nodeExitPoint, dstRGBA.rgb, dstRGBA.a);
			} 

			nodeEntryPoint = nodeExitPoint;
			//nodeEntryPoint = nodeExitPoint + rayDirection*sampleDistance/dims;
			
			//fragColor = vec4(float(curNodeIndex)/float(octreeTextureLength), 0, 0, 1);
		}
		//fragColor = vec4(1, 0, 0, 0.5);
		fragColor = dstRGBA;
		return;
	} else if(skipMode == 3) {

		entryPoint = texCoord;
		exitPoint = texture(exitPointSampler, normalizedFragPos.xy).xyz;
		vec3 dims = vec3(xDim, yDim, zDim);
		vec3 entryPointDataSpace = vec3(
			entryPoint.x * dims.x,
			entryPoint.y * dims.y,
			entryPoint.z * dims.z
		);
		vec3 exitPointDataSpace = vec3(
			exitPoint.x * dims.x,
			exitPoint.y * dims.y,
			exitPoint.z * dims.z
		);
		vec3 fullRay = (exitPoint - entryPoint) * dims; // dataspace
		float totalDistance = length(fullRay);
		vec3 rayDirection = normalize(exitPoint - entryPoint);

		vec3 nodeEntryPoint = entryPoint;
		int occuGeoLength = visibilityOrderLength/2;
		int rayEventNum = 0;

			
		vec3 hit = vec3(0,0,0);
		
	
		int merged = 0;
		int voIndex = 0;
		int intersected = 0;
		for(voIndex = 0; voIndex < visibilityOrderLength; ++voIndex) {
	
			float normalizedVoIndex = (float(voIndex) + 0.5)/float(visibilityOrderLength);
			uvec2 nodeGeoDoublet = texture(visibilityOrderSampler, vec2(normalizedVoIndex, 1)).xy;
			int nodeIndex = int(nodeGeoDoublet.x);
			int nodeType = int(nodeGeoDoublet.y); // 0=front / 1=back
			
			float normalizedNodeIndex = (float(nodeIndex) + 0.5)/float(occuGeoLength);
			
			uvec3 nodeStartPoint = texture(occuGeoStartPointSampler, vec2(normalizedNodeIndex, 1)).xyz;
			uvec3 nodeEndPoint = texture(occuGeoEndPointSampler, vec2(normalizedNodeIndex, 1)).xyz;
			uvec3 nodeTags = texture(occuGeoTagSampler, vec2(normalizedNodeIndex, 1)).rgb;
			vec3 hit = vec3(0,0,0);
			vec3 nodeEntryPointDataSpace = vec3(0,0,0);
			vec3 nodeExitPointDataSpace = vec3(0,0,0);
			float lastDepth = 0.0;
			
			if(checkLineBox(vec3(nodeStartPoint), vec3(nodeEndPoint), entryPointDataSpace, exitPointDataSpace, nodeEntryPointDataSpace, nodeExitPointDataSpace)) {
				intersected++;
				// might need to swap entry and exit point base on view direction
				float entryDistance = length(nodeEntryPointDataSpace - entryPointDataSpace);
				float exitDistance = length(nodeExitPointDataSpace - entryPointDataSpace);
				if(entryDistance > exitDistance) {
					// swap
					vec3 tmp = nodeEntryPointDataSpace;
					nodeEntryPointDataSpace = nodeExitPointDataSpace;
					nodeExitPointDataSpace = tmp;
				} 
				// generate ray event
				// calculate depth in data space
				float depth = 0.0;
				int rayEventOccuClass = 0;
			
				if(nodeType == 0) { // front face
					depth = length(vec3(nodeEntryPointDataSpace) - entryPointDataSpace)/totalDistance;
					rayEventOccuClass = int(nodeTags.r);
				} else {
					depth = length(vec3(nodeExitPointDataSpace) - entryPointDataSpace)/totalDistance;
					rayEventOccuClass = int(nodeTags.g);
				}
				addRayEvent(depth, nodeType, rayEventOccuClass, rayEventNum);
				//rayEventNum++;

				if(rayEventNum != intersected) {
					fragColor = vec4(0, 1, 1, 0.5);
					return;
				}

			
					
			}
		}

		
		vec4 dstRGBA = vec4(0,0,0,0);
		for(int eventIndex = 0; eventIndex < rayEventNum-1; ++eventIndex) {
			rayEvent segBegin = rayEventList[eventIndex];
			if(segBegin.occuClass == 0) {
				// render this segment
				rayEvent segEnd = rayEventList[eventIndex+1];
		
				if(segBegin.depth == segEnd.depth) continue;

				// perform ray casting
				vec3 segEntryPointDataSpace = entryPointDataSpace + segBegin.depth*rayDirection*totalDistance;
				vec3 segExitPointDataSpace = entryPointDataSpace + segEnd.depth*rayDirection*totalDistance;

				vec3 segEntryPoint = vec3(
					segEntryPointDataSpace.x / dims.x,
					segEntryPointDataSpace.y / dims.y,
					segEntryPointDataSpace.z / dims.z
				);
				vec3 segExitPoint = vec3(
					segExitPointDataSpace.x / dims.x,
					segExitPointDataSpace.y / dims.y,
					segExitPointDataSpace.z / dims.z
				);
				
				dstRGBA = performRayCasting(segEntryPoint, segExitPoint, dstRGBA.rgb, dstRGBA.a);
			} 
		}
		fragColor = dstRGBA;
		return;
	}

}`
}